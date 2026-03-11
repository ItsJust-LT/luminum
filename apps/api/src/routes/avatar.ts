import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);

async function resolveAvatarUrls(email: string) {
  const crypto = await import("crypto");
  const hash = crypto.createHash("md5").update(email.toLowerCase().trim()).digest("hex");
  const gravatar = `https://www.gravatar.com/avatar/${hash}?d=404&s=80`;
  return { bimi: null as string | null, gravatar };
}

async function urlReturnsOk(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    return resp.ok;
  } catch { return false; }
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: "email query param required" });
    const normalized = email.trim().toLowerCase();

    try {
      const cached = await prisma.email_avatar_cache.findUnique({ where: { email: normalized }, select: { avatar_url: true } });
      if (cached !== null) {
        return res.json({ imageUrl: cached.avatar_url, bimi: null, gravatar: null });
      }
    } catch {}

    const { bimi, gravatar } = await resolveAvatarUrls(normalized);
    const candidates: string[] = [];
    if (bimi) candidates.push(bimi);
    candidates.push(gravatar);

    let imageUrl: string | null = null;
    for (const url of candidates) {
      if (await urlReturnsOk(url)) { imageUrl = url; break; }
    }

    try {
      await prisma.email_avatar_cache.upsert({
        where: { email: normalized },
        create: { email: normalized, avatar_url: imageUrl },
        update: { avatar_url: imageUrl },
      });
    } catch {}

    res.json({ imageUrl, bimi: bimi ?? null, gravatar });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as avatarRouter };
