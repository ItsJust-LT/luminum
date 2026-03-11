import { Router, Request, Response } from "express";
import { cloudinary } from "../lib/utils/cloudinary.js";

const router = Router();

function extractPublicIdFromUrl(url: string): string | null {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    const publicIdWithVersion = parts[1].split(".")[0];
    return publicIdWithVersion.replace(/^v[0-9]+\//, "");
  } catch { return null; }
}

router.post("/delete", async (req: Request, res: Response) => {
  try {
    const url = req.body?.record?.url;
    if (!url) return res.status(400).json({ error: "No URL in record" });
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) return res.status(400).json({ error: "Failed to extract publicId" });
    await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, deleted: publicId });
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export { router as imagesRouter };
