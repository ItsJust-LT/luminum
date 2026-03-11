import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);

// POST /api/uploads/logo-r2
router.post("/logo-r2", async (req: Request, res: Response) => {
  try {
    const { logoBase64, fileName, contentType, organizationName, organizationId } = req.body;
    if (!logoBase64) return res.status(400).json({ success: false, error: "No file" });
    const buffer = Buffer.from(logoBase64, "base64");
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ success: false, error: "File too large" });

    const { uploadToR2 } = await import("../lib/utils/r2.js");
    const { updateOrganizationStorage } = await import("../lib/utils/storage.js");
    const sanitized = (organizationName || "logo").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const ext = (fileName || "logo.png").split(".").pop() || "png";
    const key = `logos/${sanitized}-${Date.now()}.${ext}`;
    const url = await uploadToR2(buffer, key, "images", contentType || "image/png");

    if (organizationName && organizationId) {
      try {
        await prisma.images.create({ data: { name: `${organizationName} Logo`, url, organization_id: organizationId, size_bytes: BigInt(buffer.length) } });
        await updateOrganizationStorage(organizationId, buffer.length);
      } catch {}
    }
    res.json({ success: true, url });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/uploads/logo-cloudinary
router.post("/logo-cloudinary", async (req: Request, res: Response) => {
  try {
    const { logoBase64, organizationName, organizationId } = req.body;
    if (!logoBase64) return res.status(400).json({ success: false, error: "No file" });
    const buffer = Buffer.from(logoBase64, "base64");
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ success: false, error: "File too large" });

    const { uploadToCloudinary } = await import("../lib/utils/cloudinary.js");
    const result = await uploadToCloudinary(buffer, { folder: "organization-logos" });

    if (organizationName && organizationId) {
      try {
        await prisma.images.create({ data: { name: `${organizationName} Logo`, url: result.secure_url, organization_id: organizationId } });
      } catch {}
    }
    res.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/uploads/file-cloudinary
router.post("/file-cloudinary", async (req: Request, res: Response) => {
  try {
    const { fileBase64, contentType } = req.body;
    if (!fileBase64) return res.status(400).json({ success: false, error: "No file" });
    const buffer = Buffer.from(fileBase64, "base64");
    const { uploadToCloudinary } = await import("../lib/utils/cloudinary.js");
    const result = await uploadToCloudinary(buffer, { folder: "support-attachments", tags: ["support"] });
    res.json({ success: true, data: { public_id: result.public_id, secure_url: result.secure_url, format: result.format, bytes: result.bytes } });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as uploadsRouter };
