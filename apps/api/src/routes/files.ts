/**
 * Proxy route to serve stored files from S3 with optional auth and caching.
 * Members can fetch org-scoped files; org logo URLs are also readable without a session when
 * they still match organization.logo (for <img> on sign-in, custom domains, email clients).
 * GET /api/files/:key — key is URL-decoded (e.g. org/{id}/images/logos/..., emails/...).
 * Query: download=1 — force Content-Disposition: attachment.
 */

import { Router, Request, Response } from "express";
import { optionalAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import * as s3 from "../lib/storage/s3.js";
import { getOrganizationIdFromKey } from "../lib/storage/keys.js";

const router = Router();

/** Decode storage key from path. Router is mounted at /api/files so path is e.g. /logos/foo.png */
function getKeyFromPath(path: string): string | null {
  const rest = path.replace(/^\//, "");
  if (!rest) return null;
  try {
    return decodeURIComponent(rest).replace(/\.\./g, ""); // no path traversal
  } catch {
    return null;
  }
}

/** Resolve key to organization id for access check. Returns null if not found or no org. */
async function getOrganizationIdForKey(
  key: string,
  userId: string
): Promise<string | null> {
  const orgFromKey = getOrganizationIdFromKey(key);
  if (orgFromKey) {
    const member = await prisma.member.findFirst({
      where: { organizationId: orgFromKey, userId },
      select: { id: true },
    });
    return member ? orgFromKey : null;
  }

  if (key.startsWith("logos/")) {
    const base = config.apiUrl.replace(/\/$/, "");
    const expectedUrl = `${base}/api/files/${encodeURIComponent(key)}`;
    const image = await prisma.images.findFirst({
      where: { url: expectedUrl },
      select: { organization_id: true },
    });
    if (!image?.organization_id) return null;
    const member = await prisma.member.findFirst({
      where: { organizationId: image.organization_id, userId },
      select: { id: true },
    });
    return member ? image.organization_id : null;
  }

  if (key.startsWith("support/")) {
    const att = await prisma.support_attachments.findFirst({
      where: { storage_key: key },
      select: { ticket_id: true },
    });
    if (!att) return null;
    const ticket = await prisma.support_tickets.findUnique({
      where: { id: att.ticket_id },
      select: { organization_id: true },
    });
    if (!ticket?.organization_id) return null;
    const member = await prisma.member.findFirst({
      where: { organizationId: ticket.organization_id, userId },
      select: { id: true },
    });
    return member ? ticket.organization_id : null;
  }

  if (key.startsWith("emails/")) {
    const att = await prisma.attachment.findFirst({
      where: { r2Key: key },
      select: { email: { select: { organization_id: true } } },
    });
    const orgId = att?.email?.organization_id ?? null;
    if (!orgId) return null;
    const member = await prisma.member.findFirst({
      where: { organizationId: orgId, userId },
      select: { id: true },
    });
    return member ? orgId : null;
  }

  return null;
}

function expectedFileProxyUrl(key: string): string {
  const base = config.apiUrl.replace(/\/$/, "");
  return `${base}/api/files/${encodeURIComponent(key)}`;
}

/** Keys that may be fetched without a session when they are still the org's public logo URL. */
function isPotentiallyPublicLogoKey(key: string): boolean {
  return /^org\/[^/]+\/images\/logos\//.test(key) || key.startsWith("logos/");
}

/**
 * Org logos are embedded in sign-in, custom domains, and emails without auth cookies.
 * Allow GET only when the file URL still matches organization.logo (or legacy images row).
 */
async function canAccessLogoWithoutAuth(key: string): Promise<boolean> {
  const expectedUrl = expectedFileProxyUrl(key);

  if (/^org\/[^/]+\/images\/logos\//.test(key)) {
    const orgId = getOrganizationIdFromKey(key);
    if (!orgId) return false;
    const org = await prisma.organization.findFirst({
      where: { id: orgId, logo: expectedUrl },
      select: { id: true },
    });
    return !!org;
  }

  if (key.startsWith("logos/")) {
    const byOrgLogo = await prisma.organization.findFirst({
      where: { logo: expectedUrl },
      select: { id: true },
    });
    if (byOrgLogo) return true;
    const img = await prisma.images.findFirst({
      where: { url: expectedUrl },
      select: { id: true },
    });
    return !!img;
  }

  return false;
}

router.get("/*", optionalAuth, async (req: Request, res: Response) => {
  const key = getKeyFromPath(req.path);
  if (!key) {
    res.status(400).json({ error: "Invalid file path" });
    return;
  }

  let allowedOrgId: string | null = null;
  if (req.user?.id) {
    allowedOrgId = await getOrganizationIdForKey(key, req.user.id);
  }
  const allowed =
    !!allowedOrgId || (await canAccessLogoWithoutAuth(key));

  if (!allowed) {
    if (req.user?.id) {
      res.status(404).json({ error: "File not found or access denied" });
      return;
    }
    if (isPotentiallyPublicLogoKey(key)) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (!s3.isStorageConfigured()) {
    res.status(503).json({ error: "Storage not configured" });
    return;
  }

  const download = /^1|true|yes$/i.test((req.query.download as string) ?? "");

  try {
    const head = await s3.headObject(key);
    if (!head) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const etag = head.etag;
    if (etag && req.headers["if-none-match"] === `"${etag}"`) {
      res.status(304).end();
      return;
    }

    const obj = await s3.getObject(key);
    if (!obj) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Content-Length", obj.contentLength);
    const cachePrivate = Boolean(req.user?.id);
    res.setHeader(
      "Cache-Control",
      cachePrivate
        ? "private, max-age=86400, stale-while-revalidate=3600"
        : "public, max-age=86400, stale-while-revalidate=3600",
    );
    if (obj.etag) res.setHeader("ETag", `"${obj.etag}"`);
    if (download) {
      const filename = key.split("/").pop() ?? "download";
      res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "%22")}"`);
    } else {
      res.setHeader("Content-Disposition", "inline");
    }

    obj.stream.pipe(res);
  } catch (err) {
    console.error("Files proxy error:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export { router as filesRouter };
