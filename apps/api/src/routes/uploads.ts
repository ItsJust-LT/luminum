import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { requireOrgPermissions } from "../lib/org-permission-http.js";
import { updateOrganizationStorage } from "../lib/utils/storage.js";
import * as s3 from "../lib/storage/s3.js";
import { orgImagesKey, orgAttachmentsSupportKey, supportKey } from "../lib/storage/keys.js";

const router = Router();
router.use(requireAuth);

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** POST /api/uploads/logo — organization logo (S3). Uses org-scoped key when organizationId is provided. */
router.post("/logo", async (req: Request, res: Response) => {
  try {
    const { logoBase64, fileName, contentType, organizationName, organizationId } = req.body;
    if (!logoBase64) return res.status(400).json({ success: false, error: "No file" });
    const buffer = Buffer.from(logoBase64, "base64");
    if (buffer.length > MAX_LOGO_BYTES) return res.status(400).json({ success: false, error: "File too large" });

    if (!s3.isStorageConfigured()) {
      return res.status(503).json({ success: false, error: "Storage not configured" });
    }

    const ext = (fileName || "logo.png").split(".").pop() || "png";
    if (organizationId && !(await requireOrgPermissions(organizationId, req.user!, res, ["org:settings:write"]))) {
      return;
    }
    const key = organizationId
      ? orgImagesKey(organizationId, ext)
      : `logos/${(organizationName || "logo").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${Date.now()}.${ext}`;
    const { url, bytes } = await s3.upload(buffer, key, { contentType: contentType || "image/png" });

    if (organizationName && organizationId) {
      try {
        await prisma.images.create({
          data: { name: `${organizationName} Logo`, url, organization_id: organizationId, size_bytes: BigInt(bytes) },
        });
        await updateOrganizationStorage(organizationId, bytes);
      } catch {}
    }
    res.json({ success: true, url, key });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ success: false, error: message });
  }
});

/** POST /api/uploads/file — support/generic file (S3). Uses org-scoped key when ticket has organizationId. */
router.post("/file", async (req: Request, res: Response) => {
  try {
    const { fileBase64, contentType, ticketId, messageId, originalFilename, filename, organizationId: bodyOrgId } = req.body;
    if (!fileBase64) return res.status(400).json({ success: false, error: "No file" });
    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length > MAX_FILE_BYTES) return res.status(400).json({ success: false, error: "File too large" });

    if (!s3.isStorageConfigured()) {
      return res.status(503).json({ success: false, error: "Storage not configured" });
    }

    let organizationId: string | null = bodyOrgId || null;
    let ticketOrgId: string | null = null;
    let ticketUserId: string | null = null;
    if (ticketId) {
      const ticket = await prisma.support_tickets.findUnique({
        where: { id: ticketId },
        select: { organization_id: true, user_id: true },
      });
      ticketOrgId = ticket?.organization_id ?? null;
      ticketUserId = ticket?.user_id ?? null;
      if (!organizationId) organizationId = ticketOrgId;
    }

    if (organizationId) {
      if (ticketId && ticketUserId !== null) {
        const isCreator = ticketUserId === req.user!.id;
        const isPlatformAdmin = req.user!.role === "admin";
        if (ticketOrgId) {
          if (organizationId !== ticketOrgId) {
            return res.status(400).json({ success: false, error: "organizationId does not match ticket" });
          }
          if (!isCreator && !isPlatformAdmin) {
            if (!(await requireOrgPermissions(organizationId, req.user!, res, ["support:reply"]))) return;
          }
        } else if (!isCreator && !isPlatformAdmin) {
          return res.status(403).json({ success: false, error: "Access denied" });
        }
      } else if (!(await requireOrgPermissions(organizationId, req.user!, res, ["support:create"]))) {
        return;
      }
    }

    const name = originalFilename || filename || "file";
    const key = organizationId
      ? orgAttachmentsSupportKey(organizationId, ticketId ?? "upload", messageId ?? null, name)
      : supportKey(ticketId ?? "upload", messageId ?? null, name);
    const { url, key: storageKey, bytes } = await s3.upload(buffer, key, { contentType: contentType || "application/octet-stream" });

    if (organizationId) {
      try {
        await updateOrganizationStorage(organizationId, bytes);
      } catch {}
    }

    res.json({
      success: true,
      data: {
        public_id: storageKey,
        storage_key: storageKey,
        secure_url: url,
        url,
        bytes,
        format: (contentType || "application/octet-stream").split("/").pop() || "bin",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ success: false, error: message });
  }
});

export { router as uploadsRouter };
