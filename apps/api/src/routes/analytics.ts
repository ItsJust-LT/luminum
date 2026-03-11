import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { createLiveToken } from "../lib/analytics-live.js";
import { cacheGet, cacheSet } from "../lib/redis-cache.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(requireAuth);

/** Resolves a website by id and verifies the user has access via organization membership. */
async function resolveWebsiteWithAccess(websiteId: string, userId: string) {
  const website = await prisma.websites.findFirst({
    where: { OR: [{ id: websiteId }, { website_id: websiteId }] },
    select: { id: true, organization_id: true },
  });
  if (!website) return null;
  const member = await prisma.member.findFirst({
    where: { organizationId: website.organization_id, userId },
  });
  if (!member) return null;
  return website;
}

// GET /api/analytics/live-ws-token?websiteId=X
// Returns a short-lived token and WebSocket URL for the dashboard to connect
// and receive live viewer count updates (sourced from Go → Express).
router.get("/live-ws-token", async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.query as Record<string, string>;
    if (!websiteId) return res.status(400).json({ error: "Missing websiteId" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const { token, exp } = createLiveToken(websiteId, req.user.id);
    const baseUrl = config.apiWsUrl;
    const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = baseUrl.replace(/^https?:\/\//, "");
    const url = `${wsProtocol}://${wsHost}/ws/analytics-live`;

    res.json({ token, url, exp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Analytics live-ws-token failed", { error: message });
    res.status(500).json({ error: message });
  }
});

// GET /api/analytics/overview?websiteId=X&start=...&end=...
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const cacheKey = `analytics:overview:${website.id}:${start}:${end}`;
    const cached = await cacheGet(cacheKey);
    if (cached != null) return res.json(cached);

    const startDate = new Date(start);
    const endDate = new Date(end);

    const [eventsAgg, sessionGroups, formCount] = await Promise.all([
      prisma.events.aggregate({
        where: { website_id: website.id, created_at: { gte: startDate, lte: endDate } },
        _count: { id: true },
        _avg: { duration: true },
      }),
      prisma.events.groupBy({
        by: ["session_id"],
        where: { website_id: website.id, created_at: { gte: startDate, lte: endDate }, session_id: { not: null } },
      }),
      prisma.form_submissions.count({
        where: { website_id: website.id, submitted_at: { gte: startDate, lte: endDate } },
      }),
    ]);

    const payload = {
      websiteId: website.id,
      period: `${start} to ${end}`,
      pageViews: eventsAgg._count.id ?? 0,
      uniqueSessions: sessionGroups.length,
      avgDuration: Math.round(eventsAgg._avg.duration ?? 0) || 0,
      formSubmissions: formCount,
    };
    await cacheSet(cacheKey, payload, 120);
    res.json(payload);
  } catch (error: any) {
    console.error("[analytics] overview error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/timeseries?websiteId=X&start=...&end=...&granularity=hour|day
router.get("/timeseries", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, granularity = "hour" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const cacheKey = `analytics:timeseries:${website.id}:${start}:${end}:${granularity}`;
    const cached = await cacheGet(cacheKey);
    if (cached != null) return res.json(cached);

    const startDate = new Date(start);
    const endDate = new Date(end);

    const events = await prisma.events.findMany({
      where: { website_id: website.id, created_at: { gte: startDate, lte: endDate } },
      select: { created_at: true, session_id: true },
    });

    const formSubs = await prisma.form_submissions.findMany({
      where: { website_id: website.id, submitted_at: { gte: startDate, lte: endDate } },
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

    const payload = {
      data,
      granularity,
      totalPeriods: data.length,
      metadata: {
        totalPageviews: events.length,
        totalSessions: new Set(events.map((e) => e.session_id).filter(Boolean)).size,
        totalFormSubmissions: formSubs.length,
      },
    };
    await cacheSet(cacheKey, payload, 120);
    res.json(payload);
  } catch (error: any) {
    console.error("[analytics] timeseries error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/top-pages?websiteId=X&start=...&end=...&limit=10
router.get("/top-pages", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, limit = "10" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const events = await prisma.events.findMany({
      where: {
        website_id: website.id,
        created_at: { gte: new Date(start), lte: new Date(end) },
        url: { not: null },
      },
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

    res.json(result);
  } catch (error: any) {
    console.error("[analytics] top-pages error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/countries?websiteId=X&start=...&end=...&limit=10
router.get("/countries", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, limit = "10" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const events = await prisma.events.findMany({
      where: { website_id: website.id, created_at: { gte: new Date(start), lte: new Date(end) } },
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

    res.json(result);
  } catch (error: any) {
    console.error("[analytics] countries error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/devices?websiteId=X&start=...&end=...&limit=5
router.get("/devices", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, limit = "5" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const events = await prisma.events.findMany({
      where: { website_id: website.id, created_at: { gte: new Date(start), lte: new Date(end) } },
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

    res.json(result);
  } catch (error: any) {
    console.error("[analytics] devices error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/realtime?websiteId=X
router.get("/realtime", async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.query as Record<string, string>;
    if (!websiteId) return res.status(400).json({ error: "Missing websiteId" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const now = new Date();
    const since2min = new Date(now.getTime() - 2 * 60 * 1000);
    const since30min = new Date(now.getTime() - 30 * 60 * 1000);

    const [recentEvents, sessionIds, count30] = await Promise.all([
      prisma.events.findMany({
        where: { website_id: website.id, created_at: { gte: since2min } },
        select: { created_at: true, url: true, country: true, device_type: true },
        orderBy: { created_at: "desc" },
        take: 20,
      }),
      prisma.events.findMany({
        where: { website_id: website.id, created_at: { gte: since2min }, session_id: { not: null } },
        select: { session_id: true },
        distinct: ["session_id"],
      }),
      prisma.events.count({
        where: { website_id: website.id, created_at: { gte: since30min } },
      }),
    ]);

    // Top pages last 30 min
    const pageEvents = await prisma.events.findMany({
      where: { website_id: website.id, created_at: { gte: since30min }, url: { not: null } },
      select: { url: true },
    });
    const pageCounts: Record<string, number> = {};
    for (const e of pageEvents) {
      const url = (e.url || "/").trim() || "/";
      pageCounts[url] = (pageCounts[url] || 0) + 1;
    }
    const topPages = Object.entries(pageCounts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top countries last 30 min
    const countryCounts: Record<string, number> = {};
    const countryEvents = await prisma.events.findMany({
      where: { website_id: website.id, created_at: { gte: since30min } },
      select: { country: true },
    });
    for (const e of countryEvents) {
      const c = (e.country || "Unknown").trim() || "Unknown";
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    }
    const topCountries = Object.entries(countryCounts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      activeVisitors: sessionIds.length,
      pageviewsLast30Min: count30,
      topPages,
      topCountries,
      recentEvents: recentEvents.map((e) => ({
        timestamp: (e.created_at ?? new Date()).toISOString(),
        url: e.url ?? "",
        country: e.country ?? "Unknown",
        deviceType: e.device_type ?? "unknown",
      })),
      lastUpdated: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[analytics] realtime error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as analyticsRouter };
