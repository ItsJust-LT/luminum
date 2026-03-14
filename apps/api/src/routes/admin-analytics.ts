import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin access required" });
  next();
}
router.use(adminOnly);

// GET /api/admin/analytics/overview?start=...&end=...
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query as Record<string, string>;
    if (!start || !end) return res.status(400).json({ error: "Missing start/end params" });

    const startDate = new Date(start);
    const endDate = new Date(end);

    const [pageViews, sessionGroups, formCount, emailCount, activeSubscriptions, totalRevenue] = await Promise.all([
      prisma.events.count({ where: { created_at: { gte: startDate, lte: endDate } } }),
      prisma.events.groupBy({
        by: ["session_id"],
        where: { created_at: { gte: startDate, lte: endDate }, session_id: { not: null } },
      }),
      prisma.form_submissions.count({ where: { submitted_at: { gte: startDate, lte: endDate } } }),
      prisma.email.count({ where: { receivedAt: { gte: startDate, lte: endDate } } }),
      prisma.subscriptions.count({ where: { status: "active" } }),
      prisma.subscriptions.aggregate({
        where: { status: "active" },
        _sum: { amount: true },
      }),
    ]);

    const avgDuration = await prisma.events.aggregate({
      where: { created_at: { gte: startDate, lte: endDate } },
      _avg: { duration: true },
    });

    res.json({
      success: true,
      overview: {
        pageViews,
        uniqueSessions: sessionGroups.length,
        avgDuration: Math.round(avgDuration._avg.duration ?? 0),
        formSubmissions: formCount,
        emails: emailCount,
        activeSubscriptions,
        totalRevenue: totalRevenue._sum.amount ?? 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/analytics/timeseries?start=...&end=...&granularity=hour|day
router.get("/timeseries", async (req: Request, res: Response) => {
  try {
    const { start, end, granularity = "day" } = req.query as Record<string, string>;
    if (!start || !end) return res.status(400).json({ error: "Missing start/end params" });

    const startDate = new Date(start);
    const endDate = new Date(end);

    const events = await prisma.events.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      select: { created_at: true, session_id: true },
    });

    const formSubs = await prisma.form_submissions.findMany({
      where: { submitted_at: { gte: startDate, lte: endDate } },
      select: { submitted_at: true },
    });

    const bucketKey = (d: Date) => {
      if (granularity === "hour") {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:00:00.000Z`;
      }
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T00:00:00.000Z`;
    };

    const buckets: Record<string, { pageViews: number; sessions: Set<string>; formSubmissions: number }> = {};

    for (const e of events) {
      const key = bucketKey(e.created_at ? new Date(e.created_at) : new Date());
      if (!buckets[key]) buckets[key] = { pageViews: 0, sessions: new Set(), formSubmissions: 0 };
      buckets[key].pageViews += 1;
      if (e.session_id) buckets[key].sessions.add(e.session_id);
    }
    for (const f of formSubs) {
      const key = bucketKey(new Date(f.submitted_at));
      if (!buckets[key]) buckets[key] = { pageViews: 0, sessions: new Set(), formSubmissions: 0 };
      buckets[key].formSubmissions += 1;
    }

    const data = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, v]) => ({
        time,
        pageViews: v.pageViews,
        uniqueSessions: v.sessions.size,
        formSubmissions: v.formSubmissions,
      }));

    res.json({
      success: true,
      data,
      granularity,
      totalPeriods: data.length,
      metadata: {
        totalPageviews: events.length,
        totalSessions: new Set(events.map((e) => e.session_id).filter(Boolean)).size,
        totalFormSubmissions: formSubs.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/analytics/breakdown?by=organization|website&start=...&end=...&limit=20
router.get("/breakdown", async (req: Request, res: Response) => {
  try {
    const { by = "organization", start, end, limit = "20" } = req.query as Record<string, string>;
    if (!start || !end) return res.status(400).json({ error: "Missing start/end params" });

    const startDate = new Date(start);
    const endDate = new Date(end);
    const maxResults = Math.min(parseInt(limit) || 20, 100);

    const websites = await prisma.websites.findMany({
      select: { id: true, website_id: true, name: true, domain: true, organization_id: true, organization: { select: { id: true, name: true, slug: true } } },
    });

    const websiteMap = new Map<string, typeof websites[0]>();
    for (const w of websites) {
      websiteMap.set(w.id, w);
      if (w.website_id) websiteMap.set(w.website_id, w);
    }

    const events = await prisma.events.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      select: { website_id: true, session_id: true },
    });

    const formSubs = await prisma.form_submissions.findMany({
      where: { submitted_at: { gte: startDate, lte: endDate } },
      select: { website_id: true },
    });

    if (by === "website") {
      const stats: Record<string, { pageViews: number; sessions: Set<string>; formSubmissions: number; name: string; domain: string; orgName: string }> = {};

      for (const e of events) {
        const w = e.website_id ? websiteMap.get(e.website_id) : null;
        const key = w?.id || e.website_id || "unknown";
        if (!stats[key]) stats[key] = { pageViews: 0, sessions: new Set(), formSubmissions: 0, name: w?.name || "Unknown", domain: w?.domain || "", orgName: w?.organization?.name || "" };
        stats[key].pageViews += 1;
        if (e.session_id) stats[key].sessions.add(e.session_id);
      }

      for (const f of formSubs) {
        const w = f.website_id ? websiteMap.get(f.website_id) : null;
        const key = w?.id || f.website_id || "unknown";
        if (!stats[key]) stats[key] = { pageViews: 0, sessions: new Set(), formSubmissions: 0, name: w?.name || "Unknown", domain: w?.domain || "", orgName: w?.organization?.name || "" };
        stats[key].formSubmissions += 1;
      }

      const result = Object.entries(stats)
        .map(([id, v]) => ({ id, name: v.name, domain: v.domain, orgName: v.orgName, pageViews: v.pageViews, uniqueSessions: v.sessions.size, formSubmissions: v.formSubmissions }))
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, maxResults);

      return res.json({ success: true, breakdown: result, by: "website" });
    }

    // Default: by organization
    const stats: Record<string, { pageViews: number; sessions: Set<string>; formSubmissions: number; name: string; slug: string }> = {};

    for (const e of events) {
      const w = e.website_id ? websiteMap.get(e.website_id) : null;
      const orgId = w?.organization_id || "unknown";
      if (!stats[orgId]) stats[orgId] = { pageViews: 0, sessions: new Set(), formSubmissions: 0, name: w?.organization?.name || "Unknown", slug: w?.organization?.slug || "" };
      stats[orgId].pageViews += 1;
      if (e.session_id) stats[orgId].sessions.add(e.session_id);
    }

    for (const f of formSubs) {
      const w = f.website_id ? websiteMap.get(f.website_id) : null;
      const orgId = w?.organization_id || "unknown";
      if (!stats[orgId]) stats[orgId] = { pageViews: 0, sessions: new Set(), formSubmissions: 0, name: w?.organization?.name || "Unknown", slug: w?.organization?.slug || "" };
      stats[orgId].formSubmissions += 1;
    }

    const result = Object.entries(stats)
      .map(([id, v]) => ({ id, name: v.name, slug: v.slug, pageViews: v.pageViews, uniqueSessions: v.sessions.size, formSubmissions: v.formSubmissions }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, maxResults);

    res.json({ success: true, breakdown: result, by: "organization" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/analytics/top-pages?start=...&end=...&limit=10
router.get("/top-pages", async (req: Request, res: Response) => {
  try {
    const { start, end, limit = "10" } = req.query as Record<string, string>;
    if (!start || !end) return res.status(400).json({ error: "Missing start/end params" });

    const events = await prisma.events.findMany({
      where: { created_at: { gte: new Date(start), lte: new Date(end) }, url: { not: null } },
      select: { url: true },
    });

    const counts: Record<string, number> = {};
    for (const e of events) {
      const url = (e.url || "/").trim() || "/";
      counts[url] = (counts[url] || 0) + 1;
    }

    const result = Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/analytics/countries?start=...&end=...&limit=10
router.get("/countries", async (req: Request, res: Response) => {
  try {
    const { start, end, limit = "10" } = req.query as Record<string, string>;
    if (!start || !end) return res.status(400).json({ error: "Missing start/end params" });

    const events = await prisma.events.findMany({
      where: { created_at: { gte: new Date(start), lte: new Date(end) } },
      select: { country: true },
    });

    const counts: Record<string, number> = {};
    for (const e of events) {
      const c = (e.country || "Unknown").trim() || "Unknown";
      counts[c] = (counts[c] || 0) + 1;
    }

    const result = Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/analytics/devices?start=...&end=...&limit=5
router.get("/devices", async (req: Request, res: Response) => {
  try {
    const { start, end, limit = "5" } = req.query as Record<string, string>;
    if (!start || !end) return res.status(400).json({ error: "Missing start/end params" });

    const events = await prisma.events.findMany({
      where: { created_at: { gte: new Date(start), lte: new Date(end) } },
      select: { device_type: true },
    });

    const counts: Record<string, number> = {};
    for (const e of events) {
      const d = (e.device_type || "unknown").trim() || "unknown";
      counts[d] = (counts[d] || 0) + 1;
    }

    const result = Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as adminAnalyticsRouter };
