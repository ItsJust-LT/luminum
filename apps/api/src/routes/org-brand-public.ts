import { Router, Request, Response } from "express";
import { initialsFromOrgName, orgBrandSvg } from "../lib/org-brand-svg.js";

const router = Router();

/** Public SVG avatar from organization name (initials). Used for login, PWA, push when no logo. */
router.get("/", (req: Request, res: Response) => {
  const name = String(req.query.name || "").trim().slice(0, 200);
  const initials = initialsFromOrgName(name || "Organization");
  const svg = orgBrandSvg(initials);
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  res.send(svg);
});

export { router as orgBrandPublicRouter };
