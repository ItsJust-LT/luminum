import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { pathParam } from "../lib/req-params.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin access required" });
  next();
}
router.use(adminOnly);

// GET /api/admin/forms/submissions?organizationId=...&websiteId=...&seen=...&contacted=...&start=...&end=...&limit=50&offset=0
router.get("/submissions", async (req: Request, res: Response) => {
  try {
    const { organizationId, websiteId, seen, contacted, start, end, limit = "50", offset = "0" } = req.query as Record<string, string>;

    const where: any = {};

    if (websiteId) {
      where.website_id = websiteId;
    } else if (organizationId) {
      const websites = await prisma.websites.findMany({ where: { organization_id: organizationId }, select: { id: true } });
      where.website_id = { in: websites.map(w => w.id) };
    }

    if (seen !== undefined) where.seen = seen === "true";
    if (contacted !== undefined) where.contacted = contacted === "true";
    if (start || end) {
      where.submitted_at = {};
      if (start) where.submitted_at.gte = new Date(start);
      if (end) where.submitted_at.lte = new Date(end);
    }

    const [submissions, total] = await Promise.all([
      prisma.form_submissions.findMany({
        where,
        include: { websites: { select: { id: true, name: true, domain: true, organization: { select: { id: true, name: true, slug: true } } } } },
        orderBy: { submitted_at: "desc" },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
      }),
      prisma.form_submissions.count({ where }),
    ]);

    const formatted = submissions.map(s => ({
      id: s.id,
      website_id: s.website_id,
      submitted_at: s.submitted_at.toISOString(),
      data: s.data && typeof s.data === "object" ? s.data : {},
      seen: s.seen,
      contacted: s.contacted,
      session_id: s.session_id,
      websiteName: s.websites?.name || "",
      websiteDomain: s.websites?.domain || "",
      organizationName: s.websites?.organization?.name || "",
      organizationSlug: s.websites?.organization?.slug || "",
      organizationId: s.websites?.organization?.id || "",
    }));

    res.json({ success: true, submissions: formatted, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/forms/stats
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [total, unseen, contacted] = await Promise.all([
      prisma.form_submissions.count(),
      prisma.form_submissions.count({ where: { seen: false } }),
      prisma.form_submissions.count({ where: { contacted: true } }),
    ]);
    const recentCount = await prisma.form_submissions.count({
      where: { submitted_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    res.json({ success: true, stats: { total, unseen, contacted, recentCount } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/admin/forms/submissions/:id/status
router.patch("/submissions/:id/status", async (req: Request, res: Response) => {
  try {
    const { seen, contacted } = req.body;
    const id = pathParam(req, "id");
    if (!id) return res.status(400).json({ success: false, error: "Missing id" });

    const submission = await prisma.form_submissions.findUnique({ where: { id } });
    if (!submission) return res.status(404).json({ success: false, error: "Not found" });

    const updates: any = {};
    if (seen !== undefined) updates.seen = seen;
    if (contacted !== undefined) updates.contacted = contacted;

    const updated = await prisma.form_submissions.update({ where: { id }, data: updates });
    res.json({
      success: true,
      submission: {
        ...updated,
        submitted_at: updated.submitted_at.toISOString(),
        data: updated.data && typeof updated.data === "object" ? updated.data : {},
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as adminFormsRouter };
