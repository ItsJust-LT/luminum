import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import {
  recoverEmbeddedZipsForEmail,
  recoverEmbeddedZipsBatch,
} from "../lib/email-recover-embedded-zips.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin access required" });
  next();
}
router.use(adminOnly);

// GET /api/admin/emails/stats?start=...&end=...
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query as Record<string, string>;
    const dateFilter: any = {};
    if (start || end) {
      dateFilter.receivedAt = {};
      if (start) dateFilter.receivedAt.gte = new Date(start);
      if (end) dateFilter.receivedAt.lte = new Date(end);
    }

    const [total, unread, inbound, outbound] = await Promise.all([
      prisma.email.count({ where: dateFilter }),
      prisma.email.count({ where: { ...dateFilter, read: false } }),
      prisma.email.count({ where: { ...dateFilter, direction: "inbound" } }),
      prisma.email.count({ where: { ...dateFilter, direction: "outbound" } }),
    ]);

    const recentCount = await prisma.email.count({
      where: { receivedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    const byOrg = await prisma.email.groupBy({
      by: ["organization_id"],
      _count: { id: true },
      where: dateFilter,
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const orgIds = byOrg.map(b => b.organization_id).filter(Boolean) as string[];
    const orgs = orgIds.length > 0
      ? await prisma.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true, slug: true } })
      : [];
    const orgMap = new Map(orgs.map(o => [o.id, o]));

    const byOrgFormatted = byOrg.map(b => ({
      organizationId: b.organization_id,
      organizationName: b.organization_id ? orgMap.get(b.organization_id)?.name || "Unknown" : "Unknown",
      count: b._count.id,
    }));

    res.json({ success: true, stats: { total, unread, inbound, outbound, recentCount, byOrg: byOrgFormatted } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/emails?organizationId=...&read=...&direction=...&limit=50&offset=0
router.get("/", async (req: Request, res: Response) => {
  try {
    const { organizationId, read, direction, limit = "50", offset = "0", search } = req.query as Record<string, string>;

    const where: any = {};
    if (organizationId) where.organization_id = organizationId;
    if (read !== undefined) where.read = read === "true";
    if (direction) where.direction = direction;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { from: { contains: search, mode: "insensitive" } },
        { to: { contains: search, mode: "insensitive" } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        select: {
          id: true, subject: true, from: true, to: true,
          direction: true, read: true, receivedAt: true, sent_at: true, createdAt: true, organization_id: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { receivedAt: "desc" },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
      }),
      prisma.email.count({ where }),
    ]);

    res.json({ success: true, emails, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/emails/recover-embedded-zips
// Body: { emailId?: string } for one row, or { limit?: number, skip?: number } to scan inbound mail in id order.
router.post("/recover-embedded-zips", async (req: Request, res: Response) => {
  try {
    const body = req.body as { emailId?: string; limit?: unknown; skip?: unknown };
    if (body.emailId && typeof body.emailId === "string") {
      const result = await recoverEmbeddedZipsForEmail(body.emailId.trim());
      return res.json({ success: true, result });
    }
    const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : undefined;
    const skip = typeof body.skip === "number" && Number.isFinite(body.skip) ? body.skip : undefined;
    const batch = await recoverEmbeddedZipsBatch({ limit, skip });
    return res.json({ success: true, batch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as adminEmailsRouter };
