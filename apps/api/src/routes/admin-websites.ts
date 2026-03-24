import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { pathParam } from "../lib/req-params.js";
import { createFullSiteScan } from "../site-audit/create-audit.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin access required" });
  next();
}
router.use(adminOnly);

// POST /api/admin/websites/:websiteId/run-audit — platform admin manual Lighthouse run
router.post("/:websiteId/run-audit", async (req: Request, res: Response) => {
  try {
    const websiteId = pathParam(req, "websiteId")!;

    const website = await prisma.websites.findUnique({
      where: { id: websiteId },
      select: { id: true, domain: true, organization_id: true },
    });
    if (!website) return res.status(404).json({ success: false, error: "Website not found" });

    const batch = await createFullSiteScan(prisma, {
      websiteId: website.id,
      organizationId: website.organization_id,
      domain: website.domain,
      triggerSource: "manual",
    });

    res.json({
      success: true,
      auditId: batch.auditId,
      pagesDiscovered: batch.pagesDiscovered,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message ?? "Failed to enqueue audit" });
  }
});

// GET /api/admin/websites?organizationId=...&analytics=...&limit=50&offset=0
router.get("/", async (req: Request, res: Response) => {
  try {
    const { organizationId, analytics, limit = "50", offset = "0", search } = req.query as Record<string, string>;

    const where: any = {};
    if (organizationId) where.organization_id = organizationId;
    if (analytics !== undefined) where.analytics = analytics === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { domain: { contains: search, mode: "insensitive" } },
      ];
    }

    const [websites, total] = await Promise.all([
      prisma.websites.findMany({
        where,
        include: { organization: { select: { id: true, name: true, slug: true } } },
        orderBy: { created_at: "desc" },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
      }),
      prisma.websites.count({ where }),
    ]);

    res.json({ success: true, websites, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/websites/stats
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [total, analyticsEnabled] = await Promise.all([
      prisma.websites.count(),
      prisma.websites.count({ where: { analytics: true } }),
    ]);
    res.json({ success: true, stats: { total, analyticsEnabled, analyticsDisabled: total - analyticsEnabled } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as adminWebsitesRouter };
