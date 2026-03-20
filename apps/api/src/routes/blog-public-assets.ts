/**
 * Unauthenticated blog asset proxy for crawlers and public sites.
 * GET /api/public/blog-assets/* — key must belong to org blog namespace and be used by a published post.
 */

import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import * as s3 from "../lib/storage/s3.js";
import { getOrganizationIdFromKey, isOrgBlogKey } from "../lib/storage/keys.js";
import { validatePreviewToken } from "./blog.js";

const router = Router();

function getKeyFromPath(path: string): string | null {
  const rest = path.replace(/^\//, "");
  if (!rest) return null;
  try {
    return decodeURIComponent(rest).replace(/\.\./g, "");
  } catch {
    return null;
  }
}

async function isKeyPublicForBlog(organizationId: string, key: string): Promise<boolean> {
  const cover = await prisma.blog_post.findFirst({
    where: {
      organization_id: organizationId,
      status: "published",
      cover_image_key: key,
    },
    select: { id: true },
  });
  if (cover) return true;

  const viaAsset = await prisma.blog_asset.findFirst({
    where: {
      s3_key: key,
      organization_id: organizationId,
      blog_post: { status: "published" },
    },
    select: { id: true },
  });
  return !!viaAsset;
}

router.get("/*", async (req: Request, res: Response) => {
  const key = getKeyFromPath(req.path);
  if (!key) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  const orgId = getOrganizationIdFromKey(key);
  if (!orgId || !isOrgBlogKey(orgId, key)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const previewTokenParam = (req.query.previewToken as string) || undefined;
  const previewOrgId = await validatePreviewToken(previewTokenParam);
  const isPreview = previewOrgId === orgId;

  if (!isPreview) {
    const allowed = await isKeyPublicForBlog(orgId, key);
    if (!allowed) {
      res.status(404).json({ error: "Not found" });
      return;
    }
  }

  if (!s3.isStorageConfigured()) {
    res.status(503).json({ error: "Storage not configured" });
    return;
  }

  try {
    const head = await s3.headObject(key);
    if (!head) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const etag = head.etag;
    if (etag && req.headers["if-none-match"] === `"${etag}"`) {
      res.status(304).end();
      return;
    }
    const obj = await s3.getObject(key);
    if (!obj) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Content-Length", obj.contentLength);
    if (isPreview) {
      // Prevent preview content from being cached by browsers/CDNs.
      res.setHeader("Cache-Control", "private, max-age=0, no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    }
    if (obj.etag) res.setHeader("ETag", `"${obj.etag}"`);
    res.setHeader("Content-Disposition", "inline");
    obj.stream.pipe(res);
  } catch (err) {
    console.error("Blog public asset error:", err);
    res.status(500).json({ error: "Failed to serve asset" });
  }
});

export { router as blogPublicAssetsRouter };
