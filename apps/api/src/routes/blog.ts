/**
 * Organization blog: dashboard CRUD + publish, public list/detail (published), uploads.
 */

import { Router, type Request, type Response } from "express";
import { requireAuth, optionalAuth } from "../middleware/require-auth.js";
import { canAccessOrganization } from "../lib/access.js";
import { prisma } from "../lib/prisma.js";
import * as s3 from "../lib/storage/s3.js";
import { orgBlogAssetKey, isOrgBlogKey, getOrganizationIdFromKey } from "../lib/storage/keys.js";
import { updateOrganizationStorage } from "../lib/utils/storage.js";
import { cacheGet, cacheSet, cacheDelByPrefix } from "../lib/redis-cache.js";
import { publicBlogAssetUrl } from "../blog/urls.js";
import { buildRenderSpecForPublish } from "../blog/parse-and-validate.js";
import { collectReferencedBlogKeys, syncBlogAssetsToPost } from "../blog/sync-assets.js";
import { buildBlogSeo } from "../blog/seo.js";
import { listAllowlistedComponents } from "../blog/allowlist.js";

const router = Router();

const BLOG_CACHE_TTL_SEC = 300;

function one(v: string | string[] | undefined): string {
  if (v === undefined) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

async function resolveOrganizationId(
  organizationId: string | undefined,
  websiteId: string | undefined
): Promise<string | null> {
  if (organizationId) return organizationId;
  if (!websiteId) return null;
  const website = await prisma.websites.findFirst({
    where: { OR: [{ id: websiteId }, { website_id: websiteId }] },
    select: { organization_id: true },
  });
  return website?.organization_id ?? null;
}

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
  return s || "post";
}

async function invalidatePublishedBlogCache(organizationId: string): Promise<void> {
  await cacheDelByPrefix(`blog:pub:${organizationId}:`);
}

async function validatePreviewTokenInternal(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const row = await prisma.blog_preview_token.findUnique({ where: { token } });
  if (!row) return null;
  if (row.expires_at < new Date()) return null;
  return row.organization_id;
}

async function ensureBlogsEnabled(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { blogs_enabled: true },
  });
  return !!org?.blogs_enabled;
}

/** GET /api/blog/asset?key= — stream org blog asset for authenticated members (drafts + published). */
router.get("/asset", requireAuth, async (req: Request, res: Response) => {
  const keyRaw = req.query.key;
  const key =
    typeof keyRaw === "string"
      ? keyRaw
      : Array.isArray(keyRaw) && typeof keyRaw[0] === "string"
        ? keyRaw[0]
        : "";
  if (!key.trim()) {
    res.status(400).json({ error: "key required" });
    return;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(key).replace(/\.\./g, "");
  } catch {
    res.status(400).json({ error: "Invalid key" });
    return;
  }
  const orgId = getOrganizationIdFromKey(decoded);
  if (!orgId || !isOrgBlogKey(orgId, decoded)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await canAccessOrganization(orgId, req.user!))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (!(await ensureBlogsEnabled(orgId))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!s3.isStorageConfigured()) {
    res.status(503).json({ error: "Storage not configured" });
    return;
  }
  try {
    const head = await s3.headObject(decoded);
    if (!head) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const etag = head.etag;
    if (etag && req.headers["if-none-match"] === `"${etag}"`) {
      res.status(304).end();
      return;
    }
    const obj = await s3.getObject(decoded);
    if (!obj) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Content-Length", obj.contentLength);
    res.setHeader("Cache-Control", "private, max-age=120, no-store");
    if (obj.etag) res.setHeader("ETag", `"${obj.etag}"`);
    res.setHeader("Content-Disposition", "inline");
    obj.stream.pipe(res);
  } catch (err) {
    console.error("Blog member asset error:", err);
    res.status(500).json({ error: "Failed to serve asset" });
  }
});

function postToPublicSummary(p: {
  id: string;
  slug: string;
  title: string;
  cover_image_key: string;
  published_at: Date | null;
  categories?: unknown;
}) {
  const cats = Array.isArray(p.categories) ? (p.categories as string[]) : [];
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    coverImageUrl: publicBlogAssetUrl(p.cover_image_key),
    publishedAt: p.published_at?.toISOString() ?? null,
    categories: cats,
  };
}

/** GET /api/blog/posts?organizationId=&websiteId=&page=&limit= — members see all; anonymous sees published only (cached). */
router.get("/posts", optionalAuth, async (req: Request, res: Response) => {
  const rawOrgId = one(req.query.organizationId as string | string[] | undefined) || undefined;
  const rawWebsiteId = one(req.query.websiteId as string | string[] | undefined) || undefined;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "12"), 10) || 12));
  const organizationId = await resolveOrganizationId(rawOrgId, rawWebsiteId);
  if (!organizationId) {
    res.status(400).json({ error: "organizationId or websiteId is required" });
    return;
  }

  const member =
    req.user && (await canAccessOrganization(organizationId, req.user)) ? true : false;

  if (member) {
    if (!(await ensureBlogsEnabled(organizationId))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
  }

  if (!member) {
    const cacheKey = `blog:pub:${organizationId}:list:${page}:${limit}`;
    const cached = await cacheGet<{ posts: ReturnType<typeof postToPublicSummary>[]; page: number; total: number; totalPages: number }>(
      cacheKey
    );
    if (cached) {
      res.json(cached);
      return;
    }

    const where = { organization_id: organizationId, status: "published" as const };
    const [total, rows] = await Promise.all([
      prisma.blog_post.count({ where }),
      prisma.blog_post.findMany({
        where,
        orderBy: { published_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          cover_image_key: true,
          published_at: true,
          categories: true,
        },
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const body = {
      posts: rows.map(postToPublicSummary),
      page,
      total,
      totalPages,
    };
    await cacheSet(cacheKey, body, BLOG_CACHE_TTL_SEC);
    res.json(body);
    return;
  }

  const rows = await prisma.blog_post.findMany({
    where: { organization_id: organizationId },
    orderBy: { updated_at: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  const total = await prisma.blog_post.count({ where: { organization_id: organizationId } });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  res.json({
    posts: rows,
    page,
    total,
    totalPages,
  });
});

/** GET /api/blog/posts/id/:postId — editor fetch by id (member only). */
router.get("/posts/id/:postId", requireAuth, async (req: Request, res: Response) => {
  const postId = one(req.params.postId);
  const post = await prisma.blog_post.findUnique({ where: { id: postId } });
  if (!post || !(await canAccessOrganization(post.organization_id, req.user!))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await ensureBlogsEnabled(post.organization_id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ post });
});

/** GET /api/blog/posts/:slug?organizationId=&websiteId=&previewToken= — published (cached), draft via preview token, or draft if member. */
router.get("/posts/:slug", optionalAuth, async (req: Request, res: Response) => {
  const slug = one(req.params.slug);
  const rawOrgId = one(req.query.organizationId as string | string[] | undefined) || undefined;
  const rawWebsiteId = one(req.query.websiteId as string | string[] | undefined) || undefined;
  const previewToken = one(req.query.previewToken as string | string[] | undefined) || undefined;
  const organizationId = await resolveOrganizationId(rawOrgId, rawWebsiteId);
  if (!organizationId) {
    res.status(400).json({ error: "organizationId or websiteId is required" });
    return;
  }

  const member =
    req.user && (await canAccessOrganization(organizationId, req.user)) ? true : false;

  let previewOrgId: string | null = null;
  if (!member && previewToken) {
    previewOrgId = await validatePreviewTokenInternal(previewToken);
  }
  const isPreview = previewOrgId === organizationId;

  if (!member && !isPreview) {
    const cacheKey = `blog:pub:${organizationId}:post:${slug}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const post = await prisma.blog_post.findFirst({
      where: { organization_id: organizationId, slug, status: "published" },
    });
    if (!post) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const spec = post.content_render_spec as object | null;
    if (!spec) {
      res.status(404).json({ error: "Post not available" });
      return;
    }
    const orgRow = await prisma.organization.findUnique({
      where: { id: post.organization_id },
      select: { metadata: true },
    });
    const seo = buildBlogSeo({
      organizationId: post.organization_id,
      organizationMetadata: orgRow?.metadata ?? null,
      slug: post.slug,
      title: post.title,
      seoTitle: post.seo_title,
      seoDescription: post.seo_description,
      coverImageKey: post.cover_image_key,
      publishedAt: post.published_at,
      updatedAt: post.updated_at,
    });
    const cats = Array.isArray(post.categories) ? (post.categories as string[]) : [];
    const body = {
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        coverImageUrl: publicBlogAssetUrl(post.cover_image_key),
        publishedAt: post.published_at?.toISOString() ?? null,
        categories: cats,
      },
      renderSpec: spec,
      seo,
    };
    await cacheSet(cacheKey, body, BLOG_CACHE_TTL_SEC);
    res.json(body);
    return;
  }

  if (isPreview && !member) {
    const post = await prisma.blog_post.findFirst({
      where: { organization_id: organizationId, slug },
    });
    if (!post) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    let spec = post.content_render_spec as object | null;
    if (!spec && post.content_markdown) {
      try {
        spec = await buildRenderSpecForPublish(post.content_markdown, post.organization_id) as object;
      } catch {
        spec = null;
      }
    }
    const orgRow = await prisma.organization.findUnique({
      where: { id: post.organization_id },
      select: { metadata: true },
    });
    const seo = buildBlogSeo({
      organizationId: post.organization_id,
      organizationMetadata: orgRow?.metadata ?? null,
      slug: post.slug,
      title: post.title,
      seoTitle: post.seo_title,
      seoDescription: post.seo_description,
      coverImageKey: post.cover_image_key,
      publishedAt: post.published_at,
      updatedAt: post.updated_at,
    });
    const cats = Array.isArray(post.categories) ? (post.categories as string[]) : [];
    res.json({
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        coverImageUrl: post.cover_image_key ? publicBlogAssetUrl(post.cover_image_key) : null,
        publishedAt: post.published_at?.toISOString() ?? null,
        categories: cats,
        status: post.status,
      },
      renderSpec: spec,
      seo,
      preview: true,
    });
    return;
  }

  const post = await prisma.blog_post.findFirst({
    where: { organization_id: organizationId, slug },
  });
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    post: {
      ...post,
      coverImageUrl: publicBlogAssetUrl(post.cover_image_key),
    },
    renderSpec: post.content_render_spec,
    seo:
      post.status === "published"
        ? buildBlogSeo({
            organizationId: post.organization_id,
            organizationMetadata: (
              await prisma.organization.findUnique({
                where: { id: post.organization_id },
                select: { metadata: true },
              })
            )?.metadata ?? null,
            slug: post.slug,
            title: post.title,
            seoTitle: post.seo_title,
            seoDescription: post.seo_description,
            coverImageKey: post.cover_image_key,
            publishedAt: post.published_at,
            updatedAt: post.updated_at,
          })
        : null,
  });
});

/** GET /api/blog/posts/search?websiteId=&q=&page=&limit=&category= — full-text search, published only (cached). */
router.get("/posts/search", optionalAuth, async (req: Request, res: Response) => {
  const rawOrgId = one(req.query.organizationId as string | string[] | undefined) || undefined;
  const rawWebsiteId = one(req.query.websiteId as string | string[] | undefined) || undefined;
  const previewToken = one(req.query.previewToken as string | string[] | undefined) || undefined;
  const q = one(req.query.q as string | string[] | undefined).trim();
  const categoryNameOrSlug = one(req.query.category as string | string[] | undefined).trim();
  const categorySlugQuery = one(req.query.categorySlug as string | string[] | undefined).trim();

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "12"), 10) || 12));

  const organizationId = await resolveOrganizationId(rawOrgId, rawWebsiteId);
  if (!organizationId) {
    res.status(400).json({ error: "organizationId or websiteId is required" });
    return;
  }

  const member = req.user && (await canAccessOrganization(organizationId, req.user)) ? true : false;
  const previewOrgId = !member && previewToken ? await validatePreviewTokenInternal(previewToken) : null;
  const isPreview = previewOrgId === organizationId;

  // Category filtering is based on slug matching, because blog_post.categories is JSONB.
  // `category` may be a display name or a slug; we slugify both sides to compare safely.
  const categorySlug = categorySlugQuery ? slugify(categorySlugQuery) : categoryNameOrSlug ? slugify(categoryNameOrSlug) : "";

  if (!q && !categorySlug) {
    res.status(400).json({ error: "q or category is required" });
    return;
  }

  const shouldUseCache = !isPreview;
  const cacheKey = `blog:${member || isPreview ? "draft" : "pub"}:${organizationId}:search:${q}:${categorySlug}:${page}:${limit}`;
  if (shouldUseCache) {
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
  }

  const whereBase: Record<string, unknown> = {
    organization_id: organizationId,
  };
  if (!member && !isPreview) {
    whereBase.status = "published" as const;
  }

  if (!categorySlug) {
    // Only full-text search: keep DB pagination.
    if (q) {
      (whereBase as any).OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content_markdown: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.blog_post.count({ where: whereBase as any }),
      prisma.blog_post.findMany({
        where: whereBase as any,
        orderBy: { published_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          cover_image_key: true,
          published_at: true,
          categories: true,
        },
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const body = {
      posts: rows.map(postToPublicSummary),
      page,
      total,
      totalPages,
      q: q || null,
      category: categoryNameOrSlug || null,
      categorySlug: null,
    };
    if (shouldUseCache) await cacheSet(cacheKey, body, BLOG_CACHE_TTL_SEC);
    res.json(body);
    return;
  }

  // Full-text search + category filter:
  // categories is JSONB, so we filter in code using slugify(category) comparisons.
  if (q) {
    (whereBase as any).OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content_markdown: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const candidates = await prisma.blog_post.findMany({
    where: whereBase as any,
    orderBy: { published_at: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      cover_image_key: true,
      published_at: true,
      categories: true,
    },
  });

  const matching = candidates.filter((p) => {
    if (!Array.isArray(p.categories)) return false;
    return (p.categories as string[]).some((c) => slugify(String(c)) === categorySlug);
  });

  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paged = matching.slice((page - 1) * limit, page * limit);

  const body = {
    posts: paged.map(postToPublicSummary),
    page,
    total,
    totalPages,
    q: q || null,
    category: categoryNameOrSlug || null,
    categorySlug,
  };

  if (shouldUseCache) await cacheSet(cacheKey, body, BLOG_CACHE_TTL_SEC);
  res.json(body);
});

/** GET /api/blog/categories?websiteId= — list distinct categories from published posts. */
router.get("/categories", optionalAuth, async (req: Request, res: Response) => {
  const rawOrgId = one(req.query.organizationId as string | string[] | undefined) || undefined;
  const rawWebsiteId = one(req.query.websiteId as string | string[] | undefined) || undefined;
  const previewToken = one(req.query.previewToken as string | string[] | undefined) || undefined;

  const organizationId = await resolveOrganizationId(rawOrgId, rawWebsiteId);
  if (!organizationId) {
    res.status(400).json({ error: "organizationId or websiteId is required" });
    return;
  }

  const member = req.user && (await canAccessOrganization(organizationId, req.user)) ? true : false;
  const previewOrgId = !member && previewToken ? await validatePreviewTokenInternal(previewToken) : null;
  const isPreview = previewOrgId === organizationId;

  const whereBase: Record<string, unknown> = {
    organization_id: organizationId,
  };
  if (!member && !isPreview) {
    whereBase.status = "published" as const;
  }

  const shouldUseCache = !isPreview;
  const cacheKey = `blog:${member || isPreview ? "draft" : "pub"}:${organizationId}:categories`;
  if (shouldUseCache) {
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
  }

  const posts = await prisma.blog_post.findMany({
    where: whereBase as any,
    select: { categories: true },
  });

  const catSet = new Set<string>();
  for (const p of posts) {
    if (Array.isArray(p.categories)) {
      for (const c of p.categories as string[]) {
        if (typeof c === "string" && c.trim()) catSet.add(c.trim());
      }
    }
  }

  const categories = [...catSet]
    .sort()
    .map((name) => ({
      name,
      slug: slugify(name),
    }));

  const body = { categories };
  if (shouldUseCache) await cacheSet(cacheKey, body, BLOG_CACHE_TTL_SEC);
  res.json(body);
});

/** GET /api/blog/posts/by-category?websiteId=&categorySlug=&page=&limit= — published posts in a category (cached). */
router.get("/posts/by-category", optionalAuth, async (req: Request, res: Response) => {
  const rawOrgId = one(req.query.organizationId as string | string[] | undefined) || undefined;
  const rawWebsiteId = one(req.query.websiteId as string | string[] | undefined) || undefined;
  const previewToken = one(req.query.previewToken as string | string[] | undefined) || undefined;
  const categorySlug = one(req.query.categorySlug as string | string[] | undefined).trim();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "12"), 10) || 12));

  const organizationId = await resolveOrganizationId(rawOrgId, rawWebsiteId);
  if (!organizationId) {
    res.status(400).json({ error: "organizationId or websiteId is required" });
    return;
  }
  if (!categorySlug) {
    res.status(400).json({ error: "categorySlug is required" });
    return;
  }

  const member = req.user && (await canAccessOrganization(organizationId, req.user)) ? true : false;
  const previewOrgId = !member && previewToken ? await validatePreviewTokenInternal(previewToken) : null;
  const isPreview = previewOrgId === organizationId;
  if (!member && previewToken && !isPreview) {
    // Token provided but not valid for this org.
    res.status(404).json({ error: "Not found" });
    return;
  }

  const shouldUseCache = !isPreview;
  const cacheKey = `blog:${member || isPreview ? "draft" : "pub"}:${organizationId}:cat:${categorySlug}:${page}:${limit}`;
  if (shouldUseCache) {
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
  }

  const whereBase: Record<string, unknown> = {
    organization_id: organizationId,
  };
  if (!member && !isPreview) {
    whereBase.status = "published" as const;
  }

  const candidates = await prisma.blog_post.findMany({
    where: whereBase as any,
    orderBy: { published_at: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      cover_image_key: true,
      published_at: true,
      categories: true,
    },
  });

  const matching = candidates.filter((p) => {
    if (!Array.isArray(p.categories)) return false;
    return (p.categories as string[]).some((c) => slugify(String(c)) === categorySlug);
  });

  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paged = matching.slice((page - 1) * limit, page * limit);
  const categoryName =
    matching.length > 0
      ? ((matching[0]!.categories as string[]).find((c) => slugify(String(c)) === categorySlug) ?? categorySlug)
      : categorySlug;

  const body = {
    posts: paged.map(postToPublicSummary),
    page,
    total,
    totalPages,
    category: { name: categoryName, slug: categorySlug },
  };

  if (shouldUseCache) await cacheSet(cacheKey, body, BLOG_CACHE_TTL_SEC);
  res.json(body);
});

/** GET /api/blog/components — allowlist + prop schemas for editor. */
router.get("/components", (_req: Request, res: Response) => {
  res.json({ components: listAllowlistedComponents() });
});

/** POST /api/blog/upload — blog image/file (org-scoped key + blog_asset row). */
router.post("/upload", requireAuth, async (req: Request, res: Response) => {
  try {
    const { organizationId, postId, fileBase64, contentType, originalFilename } = req.body as {
      organizationId?: string;
      postId?: string | null;
      fileBase64?: string;
      contentType?: string;
      originalFilename?: string;
    };
    if (!organizationId || !(await canAccessOrganization(organizationId, req.user!))) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (!(await ensureBlogsEnabled(organizationId))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!fileBase64) {
      res.status(400).json({ error: "fileBase64 required" });
      return;
    }
    if (!s3.isStorageConfigured()) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }
    const buffer = Buffer.from(fileBase64, "base64");
    const max = 25 * 1024 * 1024;
    if (buffer.length > max) {
      res.status(400).json({ error: "File too large" });
      return;
    }
    const name = (originalFilename || "upload").slice(0, 500);
    const scope = postId || "draft";
    const key = orgBlogAssetKey(organizationId, scope, name);
    const mime = contentType || "application/octet-stream";
    const type = mime.startsWith("image/") ? "image" : "file";
    await s3.upload(buffer, key, { contentType: mime });
    await prisma.blog_asset.create({
      data: {
        organization_id: organizationId,
        blog_post_id: postId || null,
        type,
        s3_key: key,
        mime,
        size_bytes: buffer.length,
        original_filename: name,
      },
    });
    try {
      await updateOrganizationStorage(organizationId, buffer.length);
    } catch {
      /* ignore */
    }
    res.json({ key, url: publicBlogAssetUrl(key) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

/** POST /api/blog/posts — create draft. */
router.post("/posts", requireAuth, async (req: Request, res: Response) => {
  const { organizationId, title, slug, content_markdown, cover_image_key, categories } = req.body as {
    organizationId?: string;
    title?: string;
    slug?: string;
    content_markdown?: string;
    cover_image_key?: string;
    categories?: string[];
  };
  if (!organizationId || !(await canAccessOrganization(organizationId, req.user!))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (!(await ensureBlogsEnabled(organizationId))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const t = (title || "Untitled").trim().slice(0, 500);
  const baseSlug = slugify(slug || t);
  let finalSlug = baseSlug;
  let n = 0;
  while (
    await prisma.blog_post.findFirst({
      where: { organization_id: organizationId, slug: finalSlug },
      select: { id: true },
    })
  ) {
    n += 1;
    finalSlug = `${baseSlug}-${n}`;
  }
  const post = await prisma.blog_post.create({
    data: {
      organization_id: organizationId,
      slug: finalSlug,
      title: t,
      content_markdown: content_markdown ?? "",
      cover_image_key: (cover_image_key ?? "").trim(),
      status: "draft",
      categories: Array.isArray(categories) ? categories.map((c) => String(c).trim()).filter(Boolean) : undefined,
    },
  });
  res.status(201).json({ post });
});

/** PATCH /api/blog/posts/:id */
router.patch("/posts/:id", requireAuth, async (req: Request, res: Response) => {
  const id = one(req.params.id);
  const existing = await prisma.blog_post.findUnique({ where: { id } });
  if (!existing || !(await canAccessOrganization(existing.organization_id, req.user!))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await ensureBlogsEnabled(existing.organization_id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const body = req.body as {
    title?: string;
    slug?: string;
    content_markdown?: string;
    cover_image_key?: string;
    seo_title?: string | null;
    seo_description?: string | null;
    status?: "draft" | "published";
    categories?: string[];
  };

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 500);
  if (body.content_markdown !== undefined) data.content_markdown = body.content_markdown;
  if (body.cover_image_key !== undefined) data.cover_image_key = String(body.cover_image_key).trim();
  if (body.seo_title !== undefined) data.seo_title = body.seo_title;
  if (body.seo_description !== undefined) data.seo_description = body.seo_description;
  if (body.categories !== undefined) data.categories = Array.isArray(body.categories) ? body.categories.map((c) => String(c).trim()).filter(Boolean) : [];

  if (body.slug !== undefined) {
    const s = slugify(String(body.slug));
    const clash = await prisma.blog_post.findFirst({
      where: { organization_id: existing.organization_id, slug: s, id: { not: id } },
      select: { id: true },
    });
    if (clash) {
      res.status(400).json({ error: "Slug already in use" });
      return;
    }
    data.slug = s;
  }

  if (body.status === "draft" && existing.status === "published") {
    data.status = "draft";
    data.published_at = null;
    data.content_render_spec = null;
  }

  const updated = await prisma.blog_post.update({
    where: { id },
    data: data as object,
  });

  if (existing.status === "published") {
    await invalidatePublishedBlogCache(existing.organization_id);
  }

  res.json({ post: updated });
});

/** POST /api/blog/posts/:id/preview-spec — build renderSpec from markdown (no persist). */
router.post("/posts/:id/preview-spec", requireAuth, async (req: Request, res: Response) => {
  const id = one(req.params.id);
  const existing = await prisma.blog_post.findUnique({ where: { id } });
  if (!existing || !(await canAccessOrganization(existing.organization_id, req.user!))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await ensureBlogsEnabled(existing.organization_id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const body = req.body as { content_markdown?: string };
  const md = body.content_markdown ?? existing.content_markdown;
  try {
    const renderSpec = await buildRenderSpecForPublish(md, existing.organization_id);
    res.json({ renderSpec });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid content";
    res.status(400).json({ error: msg });
  }
});

/** POST /api/blog/posts/:id/publish */
router.post("/posts/:id/publish", requireAuth, async (req: Request, res: Response) => {
  const id = one(req.params.id);
  const existing = await prisma.blog_post.findUnique({ where: { id } });
  if (!existing || !(await canAccessOrganization(existing.organization_id, req.user!))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await ensureBlogsEnabled(existing.organization_id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const cover = existing.cover_image_key?.trim();
  if (!cover) {
    res.status(400).json({ error: "Cover image is required to publish" });
    return;
  }
  if (!isOrgBlogKey(existing.organization_id, cover)) {
    res.status(400).json({ error: "Cover image must be an organization blog upload" });
    return;
  }

  let renderSpec;
  try {
    renderSpec = await buildRenderSpecForPublish(existing.content_markdown, existing.organization_id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid content";
    res.status(400).json({ error: msg });
    return;
  }

  const keys = collectReferencedBlogKeys(cover, existing.content_markdown, renderSpec);

  const publishedAt = existing.published_at ?? new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.blog_post.update({
        where: { id },
        data: {
          content_render_spec: renderSpec as object,
          status: "published",
          published_at: publishedAt,
        },
      });
      await syncBlogAssetsToPost(tx, existing.organization_id, id, keys);
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    res.status(500).json({ error: msg });
    return;
  }

  await invalidatePublishedBlogCache(existing.organization_id);

  const post = await prisma.blog_post.findUnique({
    where: { id },
  });
  if (!post) {
    res.json({ ok: true });
    return;
  }
  const orgRow = await prisma.organization.findUnique({
    where: { id: post.organization_id },
    select: { metadata: true },
  });
  const seo = buildBlogSeo({
    organizationId: post.organization_id,
    organizationMetadata: orgRow?.metadata ?? null,
    slug: post.slug,
    title: post.title,
    seoTitle: post.seo_title,
    seoDescription: post.seo_description,
    coverImageKey: post.cover_image_key,
    publishedAt: post.published_at,
    updatedAt: post.updated_at,
  });
  res.json({
    post,
    renderSpec,
    seo,
  });
});

/** DELETE /api/blog/posts/:id — remove post (member only). */
router.delete("/posts/:id", requireAuth, async (req: Request, res: Response) => {
  const id = one(req.params.id);
  const existing = await prisma.blog_post.findUnique({ where: { id } });
  if (!existing || !(await canAccessOrganization(existing.organization_id, req.user!))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await ensureBlogsEnabled(existing.organization_id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing.status === "published") {
    await invalidatePublishedBlogCache(existing.organization_id);
  }
  await prisma.blog_post.delete({ where: { id } });
  res.json({ ok: true });
});

/** POST /api/blog/posts/:id/preview-token — mint an org-scoped preview token (24h expiry). */
router.post("/posts/:id/preview-token", requireAuth, async (req: Request, res: Response) => {
  const id = one(req.params.id);
  const existing = await prisma.blog_post.findUnique({ where: { id } });
  if (!existing || !(await canAccessOrganization(existing.organization_id, req.user!))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!(await ensureBlogsEnabled(existing.organization_id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const row = await prisma.blog_preview_token.create({
    data: {
      organization_id: existing.organization_id,
      expires_at: expiresAt,
    },
  });

  res.json({ token: row.token, expiresAt: expiresAt.toISOString() });
});

export { router as blogRouter, validatePreviewTokenInternal as validatePreviewToken };
