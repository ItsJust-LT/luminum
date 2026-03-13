import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { updateOrganizationStorage } from "../lib/utils/storage.js";
import * as s3 from "../lib/storage/s3.js";
import { logoKey, supportKey } from "../lib/storage/keys.js";

const router = Router();
router.use(requireAuth);

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** POST /api/uploads/logo (and legacy /logo-r2, /logo-cloudinary) — organization logo (S3) */
router.post(["/logo", "/logo-r2", "/logo-cloudinary"], async (req: Request, res: Response) => {
  try {
    const { logoBase64, fileName, contentType, organizationName, organizationId } = req.body;
    if (!logoBase64) return res.status(400).json({ success: false, error: "No file" });
    const buffer = Buffer.from(logoBase64, "base64");
    if (buffer.length > MAX_LOGO_BYTES) return res.status(400).json({ success: false, error: "File too large" });

    if (!s3.isStorageConfigured()) {
      return res.status(503).json({ success: false, error: "Storage not configured" });
    }

    const ext = (fileName || "logo.png").split(".").pop() || "png";
    const key = logoKey(organizationName ?? "logo", ext);
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

/** POST /api/uploads/file (and legacy /file-cloudinary) — support/generic file (S3). */
router.post(["/file", "/file-cloudinary"], async (req: Request, res: Response) => {
  try {
    const { fileBase64, contentType, ticketId, messageId, originalFilename, filename } = req.body;
    if (!fileBase64) return res.status(400).json({ success: false, error: "No file" });
    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length > MAX_FILE_BYTES) return res.status(400).json({ success: false, error: "File too large" });

    if (!s3.isStorageConfigured()) {
      return res.status(503).json({ success: false, error: "Storage not configured" });
    }

    const name = originalFilename || filename || "file";
    const key = supportKey(ticketId ?? "upload", messageId ?? null, name);
    const { url, key: storageKey, bytes } = await s3.upload(buffer, key, { contentType: contentType || "application/octet-stream" });

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
