import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { pathParam, queryParam } from "../lib/req-params.js";

const router = Router();
router.use(requireAuth);

// GET /api/forms?websiteId=...&seen=true&contacted=false
router.get("/", async (req: Request, res: Response) => {
  try {
    const websiteId = queryParam(req, "websiteId");
    const where: any = { website_id: websiteId };
    if (req.query.seen !== undefined) where.seen = req.query.seen === "true";
    if (req.query.contacted !== undefined) where.contacted = req.query.contacted === "true";

    const submissions = await prisma.form_submissions.findMany({ where, orderBy: { submitted_at: "desc" } });
    const formatted = submissions.map(s => ({
      ...s, submitted_at: s.submitted_at.toISOString(), created_at: s.submitted_at.toISOString(), updated_at: s.submitted_at.toISOString(),
      data: s.data && typeof s.data === "object" ? s.data : {},
    }));
    res.json({ success: true, submissions: formatted });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/forms/unseen-count?organizationId=...
router.get("/unseen-count", async (req: Request, res: Response) => {
  try {
    const organizationId = queryParam(req, "organizationId");
    const websites = await prisma.websites.findMany({ where: { organization_id: organizationId }, select: { id: true } });
    if (websites.length === 0) return res.json({ success: true, count: 0 });
    const count = await prisma.form_submissions.count({ where: { website_id: { in: websites.map(w => w.id) }, seen: false } });
    res.json({ success: true, count });
  } catch (error: any) {
    res.json({ success: false, error: error.message, count: 0 });
  }
});

// GET /api/forms/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const submission = await prisma.form_submissions.findUnique({ where: { id }, include: { websites: { select: { organization_id: true } } } });
    if (!submission) return res.status(404).json({ success: false, error: "Not found" });

    if (id) prisma.form_submissions.update({ where: { id }, data: { seen: true } }).catch(console.error);

    res.json({ success: true, submission: { ...submission, submitted_at: submission.submitted_at.toISOString(), created_at: submission.submitted_at.toISOString(), updated_at: submission.submitted_at.toISOString(), data: submission.data && typeof submission.data === "object" ? submission.data : {} } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// PATCH /api/forms/:id/status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { seen, contacted } = req.body;
    const id = pathParam(req, "id");
    const submission = await prisma.form_submissions.findUnique({ where: { id }, include: { websites: { select: { organization_id: true } } } });
    if (!submission) return res.status(404).json({ success: false, error: "Not found" });

    const updates: any = {};
    if (seen !== undefined) updates.seen = seen;
    if (contacted !== undefined) updates.contacted = contacted;

    const updated = await prisma.form_submissions.update({ where: { id: id! }, data: updates });

    res.json({ success: true, submission: { ...updated, submitted_at: updated.submitted_at.toISOString(), created_at: updated.submitted_at.toISOString(), updated_at: updated.submitted_at.toISOString(), data: updated.data && typeof updated.data === "object" ? updated.data : {} } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as formsRouter };
