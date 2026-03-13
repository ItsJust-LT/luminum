import { Router, Request, Response } from "express";
import * as s3 from "../lib/storage/s3.js";

const router = Router();

/** Extract storage key from our proxy URL (e.g. https://api.../api/files/logos/xxx.png -> logos/xxx.png) */
function extractKeyFromProxyUrl(url: string): string | null {
  const prefix = "/api/files/";
  const i = url.indexOf(prefix);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + prefix.length));
  } catch {
    return null;
  }
}

router.post("/delete", async (req: Request, res: Response) => {
  try {
    const url = req.body?.record?.url;
    if (!url) return res.status(400).json({ error: "No URL in record" });
    const key = extractKeyFromProxyUrl(url);
    if (!key) return res.status(400).json({ error: "Unsupported URL; only storage proxy URLs can be deleted" });
    if (!s3.isStorageConfigured()) return res.status(503).json({ error: "Storage not configured" });
    const ok = await s3.remove(key);
    res.json({ success: true, deleted: key, ok });
  } catch (err) {
    console.error("Image delete error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export { router as imagesRouter };
