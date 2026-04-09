import { getPublishedPosts, getCategories } from "../blog/fetch.js";
import type { BlogFetchOptions } from "../blog/fetch.js";

export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface BlogSitemapOptions extends BlogFetchOptions {
  /** Your site's base URL, e.g. "https://yoursite.com". */
  baseUrl: string;
  /** Path prefix for blog post routes. Defaults to "/blog". */
  blogPathPrefix?: string;
  /** Path prefix for category pages. Defaults to "/blog/category". */
  categoryPathPrefix?: string;
  /** Include category page entries. Defaults to true. */
  includeCategories?: boolean;
  /** Include the blog index page itself (e.g. /blog). Defaults to true. */
  includeBlogIndex?: boolean;
  /** Max posts per API page when building sitemap. Defaults to 50. */
  pageSize?: number;
  /**
   * Fail fast instead of silently returning empty entries when blog/category fetch fails.
   * Defaults to false for backwards compatibility.
   */
  strict?: boolean;
  /** Optional callback for observability when a blog/category fetch fails. */
  onError?: (error: unknown, stage: "posts" | "categories" | "page") => void;
}

export interface StaticSitemapOptions {
  /** Your site's base URL, e.g. "https://yoursite.com". */
  baseUrl: string;
  /**
   * Internal route paths, e.g. ["/", "/about", "/services"].
   * Dynamic routes should be resolved before passing here.
   */
  routes: string[];
  /** Optional timestamp applied to all generated entries. Defaults to now. */
  lastModified?: string | Date;
}

export interface WebsiteSitemapOptions extends BlogSitemapOptions {
  /**
   * Static route paths to merge with blog URLs.
   * Dynamic routes should be resolved by the consumer app before passing.
   */
  staticRoutes?: string[];
  /** Optional timestamp applied to generated static entries. Defaults to now. */
  staticLastModified?: string | Date;
}

function normalizePrefix(prefix: string, fallback: string): string {
  const raw = (prefix || fallback).trim();
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`;
}

function normalizeRoutePath(route: string): string {
  const trimmed = (route || "").trim();
  if (!trimmed) return "/";
  if (trimmed === "/") return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}

function inferSitemapPriority(route: string): number {
  const path = normalizeRoutePath(route);
  const depth = path.split("/").filter(Boolean).length;
  const isHomepage = path === "/";
  const isLegalPage =
    path.includes("privacy") || path.includes("terms") || path.includes("cookies");
  if (isHomepage) return 1;
  if (isLegalPage) return 0.3;
  if (depth === 1) return 0.8;
  return 0.7;
}

function inferSitemapChangeFrequency(
  route: string
): SitemapEntry["changeFrequency"] {
  const path = normalizeRoutePath(route);
  const depth = path.split("/").filter(Boolean).length;
  const isHomepage = path === "/";
  const isLegalPage =
    path.includes("privacy") || path.includes("terms") || path.includes("cookies");
  if (isLegalPage) return "yearly";
  if (isHomepage || depth === 1) return "weekly";
  return "monthly";
}

/**
 * Build sitemap entries for internal/static app routes.
 * This complements `getBlogSitemapEntries`, which only includes blog URLs.
 */
export function getStaticSitemapEntries(
  opts: StaticSitemapOptions
): SitemapEntry[] {
  const base = opts.baseUrl.replace(/\/$/, "");
  const lastModified = opts.lastModified ?? new Date();
  const uniqueRoutes = [...new Set(opts.routes.map(normalizeRoutePath))];

  return uniqueRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified,
    changeFrequency: inferSitemapChangeFrequency(route),
    priority: inferSitemapPriority(route),
  }));
}

/**
 * Generate sitemap entries for all published blog posts (paginated fetching)
 * and optionally for category pages. Avoids loading all posts at once.
 *
 * @example
 * ```ts
 * // app/sitemap.ts
 * import { getBlogSitemapEntries } from "@itsjust-lt/website-kit/metadata";
 *
 * export default async function sitemap() {
 *   const blogEntries = await getBlogSitemapEntries({
 *     websiteId: process.env.LUMINUM_WEBSITE_ID!,
 *     baseUrl: "https://yoursite.com",
 *   });
 *   return [
 *     { url: "https://yoursite.com", lastModified: new Date() },
 *     ...blogEntries,
 *   ];
 * }
 * ```
 */
export async function getBlogSitemapEntries(
  opts: BlogSitemapOptions
): Promise<SitemapEntry[]> {
  const postPrefix = normalizePrefix(opts.blogPathPrefix ?? "/blog", "/blog");
  const categoryPrefix = normalizePrefix(opts.categoryPathPrefix ?? "/blog/category", "/blog/category");
  const base = opts.baseUrl.replace(/\/$/, "");
  const pageSize = opts.pageSize ?? 50;
  const includeCategories = opts.includeCategories !== false;
  const includeBlogIndex = opts.includeBlogIndex !== false;
  let latestPublishedAt: Date | null = null;

  const entries: SitemapEntry[] = [];
  let page = 1;

  if (includeBlogIndex && postPrefix) {
    entries.push({
      url: `${base}${postPrefix}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  try {
    while (true) {
      const data = await getPublishedPosts({ ...opts, page, limit: pageSize });
      for (const post of data.posts) {
        const publishedAt = post.publishedAt ? new Date(post.publishedAt) : new Date();
        if (!latestPublishedAt || publishedAt > latestPublishedAt) {
          latestPublishedAt = publishedAt;
        }
        entries.push({
          url: `${base}${postPrefix}/${encodeURIComponent(post.slug)}`,
          lastModified: publishedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
      if (page >= data.totalPages) break;
      page++;
    }
  } catch (error) {
    opts.onError?.(error, "posts");
    if (opts.strict) throw error;
    // Blogs disabled, network error, or 404 from API — omit blog URLs from sitemap.
    return entries;
  }

  if (includeCategories) {
    try {
      const { categories } = await getCategories(opts);
      for (const cat of categories) {
        entries.push({
          url: `${base}${categoryPrefix}/${encodeURIComponent(cat.slug)}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    } catch (error) {
      opts.onError?.(error, "categories");
      if (opts.strict) throw error;
      // categories endpoint may not exist yet on older backends
    }
  }

  if (includeBlogIndex && postPrefix && latestPublishedAt) {
    const blogIndexUrl = `${base}${postPrefix}`;
    const idx = entries.findIndex((entry) => entry.url === blogIndexUrl);
    if (idx >= 0) entries[idx] = { ...entries[idx], lastModified: latestPublishedAt };
  }

  return entries;
}

/**
 * Get a single page of blog sitemap entries (for sitemap index patterns).
 */
export async function getBlogSitemapEntriesPage(
  opts: BlogSitemapOptions & { page: number }
): Promise<{ entries: SitemapEntry[]; totalPages: number }> {
  const postPrefix = normalizePrefix(opts.blogPathPrefix ?? "/blog", "/blog");
  const base = opts.baseUrl.replace(/\/$/, "");
  const pageSize = opts.pageSize ?? 50;

  try {
    const data = await getPublishedPosts({ ...opts, page: opts.page, limit: pageSize });
    const entries: SitemapEntry[] = data.posts.map((post) => ({
      url: `${base}${postPrefix}/${encodeURIComponent(post.slug)}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    return { entries, totalPages: data.totalPages };
  } catch (error) {
    opts.onError?.(error, "page");
    if (opts.strict) throw error;
    return { entries: [], totalPages: 1 };
  }
}

/**
 * Build a full client sitemap (static internal routes + blog entries),
 * deduplicate URLs, and prefer the newest `lastModified` when duplicates exist.
 */
export async function getWebsiteSitemapEntries(
  opts: WebsiteSitemapOptions
): Promise<SitemapEntry[]> {
  const staticEntries = opts.staticRoutes?.length
    ? getStaticSitemapEntries({
        baseUrl: opts.baseUrl,
        routes: opts.staticRoutes,
        lastModified: opts.staticLastModified,
      })
    : [];

  const blogEntries = await getBlogSitemapEntries(opts);
  const merged = [...staticEntries, ...blogEntries];
  const byUrl = new Map<string, SitemapEntry>();

  for (const entry of merged) {
    const prev = byUrl.get(entry.url);
    if (!prev) {
      byUrl.set(entry.url, entry);
      continue;
    }
    const prevDate =
      prev.lastModified != null ? new Date(prev.lastModified).getTime() : 0;
    const nextDate =
      entry.lastModified != null ? new Date(entry.lastModified).getTime() : 0;
    if (nextDate >= prevDate) {
      byUrl.set(entry.url, { ...prev, ...entry });
    }
  }

  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}
