import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { createLiveToken, getLivePages } from "../lib/analytics-live.js";
import { cacheGet, cacheSet, isAnalyticsDirty } from "../lib/redis-cache.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(requireAuth);

/** Resolves a website by id or website_id and verifies the user has access. */
async function resolveWebsiteWithAccess(websiteId: string, userId: string) {
  const website = await prisma.websites.findFirst({
    where: { OR: [{ id: websiteId }, { website_id: websiteId }] },
    select: { id: true, website_id: true, organization_id: true },
  });
  if (!website) return null;
  const member = await prisma.member.findFirst({
    where: { organizationId: website.organization_id, userId },
  });
  if (!member) return null;
  return website;
}

/** Website IDs to use when querying events/form_submissions (script may send id or website_id). */
function websiteIdFilter(website: { id: string; website_id: string | null }) {
  const ids = [website.id];
  if (website.website_id && website.website_id !== website.id) ids.push(website.website_id);
  return { in: ids };
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
    const skipCache = await isAnalyticsDirty(website.id);
    if (!skipCache) {
      const cached = await cacheGet(cacheKey);
      if (cached != null) return res.json(cached);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const websiteIds = websiteIdFilter(website);
    const [eventsAgg, sessionGroups, formCount] = await Promise.all([
      prisma.events.aggregate({
        where: { website_id: websiteIds, created_at: { gte: startDate, lte: endDate } },
        _count: { id: true },
        _avg: { duration: true },
      }),
      prisma.events.groupBy({
        by: ["session_id"],
        where: { website_id: websiteIds, created_at: { gte: startDate, lte: endDate }, session_id: { not: null } },
      }),
      prisma.form_submissions.count({
        where: { website_id: websiteIds, submitted_at: { gte: startDate, lte: endDate } },
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
    await cacheSet(cacheKey, payload, 60);
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
    const skipCache = await isAnalyticsDirty(website.id);
    if (!skipCache) {
      const cached = await cacheGet(cacheKey);
      if (cached != null) return res.json(cached);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const websiteIds = websiteIdFilter(website);

    const events = await prisma.events.findMany({
      where: { website_id: websiteIds, created_at: { gte: startDate, lte: endDate } },
      select: { created_at: true, session_id: true },
    });

    const formSubs = await prisma.form_submissions.findMany({
      where: { website_id: websiteIds, submitted_at: { gte: startDate, lte: endDate } },
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
    await cacheSet(cacheKey, payload, 60);
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
        website_id: websiteIdFilter(website),
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
      where: { website_id: websiteIdFilter(website), created_at: { gte: new Date(start), lte: new Date(end) } },
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
      where: { website_id: websiteIdFilter(website), created_at: { gte: new Date(start), lte: new Date(end) } },
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

    const ids = websiteIdFilter(website);
    const now = new Date();
    const since2min = new Date(now.getTime() - 2 * 60 * 1000);
    const since30min = new Date(now.getTime() - 30 * 60 * 1000);

    const [recentEvents, sessionIds, count30] = await Promise.all([
      prisma.events.findMany({
        where: { website_id: ids, created_at: { gte: since2min } },
        select: { created_at: true, url: true, country: true, device_type: true },
        orderBy: { created_at: "desc" },
        take: 20,
      }),
      prisma.events.findMany({
        where: { website_id: ids, created_at: { gte: since2min }, session_id: { not: null } },
        select: { session_id: true },
        distinct: ["session_id"],
      }),
      prisma.events.count({
        where: { website_id: ids, created_at: { gte: since30min } },
      }),
    ]);

    // Top pages last 30 min
    const pageEvents = await prisma.events.findMany({
      where: { website_id: ids, created_at: { gte: since30min }, url: { not: null } },
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
      where: { website_id: ids, created_at: { gte: since30min } },
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

// GET /api/analytics/live-pages?websiteId=X
// Returns the current per-page live visitor breakdown
router.get("/live-pages", async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.query as Record<string, string>;
    if (!websiteId) return res.status(400).json({ error: "Missing websiteId" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const pages = getLivePages(websiteId);
    // Also try with the other ID form
    const altPages = website.website_id && website.website_id !== websiteId
      ? getLivePages(website.website_id)
      : {};

    const merged = { ...altPages, ...pages };
    res.json({ websiteId: website.id, pages: merged });
  } catch (error: any) {
    logger.error("Analytics live-pages failed", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/page-flow?websiteId=X&start=...&end=...&limit=50
// Returns page transition data for flow visualization
router.get("/page-flow", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, limit = "50" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const cacheKey = `analytics:page-flow:${website.id}:${start}:${end}`;
    const cached = await cacheGet(cacheKey);
    if (cached != null) return res.json(cached);

    const startDate = new Date(start);
    const endDate = new Date(end);
    const websiteIds = websiteIdFilter(website);

    const transitions = await prisma.page_transitions.findMany({
      where: {
        website_id: websiteIds.in[0],
        created_at: { gte: startDate, lte: endDate },
      },
      select: { from_page: true, to_page: true, session_id: true },
    });

    // Also try with the other ID if available
    let allTransitions = transitions;
    if (websiteIds.in.length > 1) {
      const extra = await prisma.page_transitions.findMany({
        where: {
          website_id: websiteIds.in[1],
          created_at: { gte: startDate, lte: endDate },
        },
        select: { from_page: true, to_page: true, session_id: true },
      });
      allTransitions = [...transitions, ...extra];
    }

    // Aggregate transition counts
    const linkCounts: Record<string, number> = {};
    const pageSessions: Record<string, Set<string>> = {};

    for (const t of allTransitions) {
      const key = `${t.from_page}::${t.to_page}`;
      linkCounts[key] = (linkCounts[key] || 0) + 1;

      if (!pageSessions[t.from_page]) pageSessions[t.from_page] = new Set();
      if (!pageSessions[t.to_page]) pageSessions[t.to_page] = new Set();
      pageSessions[t.from_page].add(t.session_id);
      pageSessions[t.to_page].add(t.session_id);
    }

    const links = Object.entries(linkCounts)
      .map(([key, count]) => {
        const [source, target] = key.split("::");
        return { source, target, value: count };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, parseInt(limit));

    // Build nodes from links
    const nodeSet = new Set<string>();
    for (const l of links) {
      nodeSet.add(l.source);
      nodeSet.add(l.target);
    }
    const nodes = Array.from(nodeSet).map(page => ({
      id: page,
      sessions: pageSessions[page]?.size ?? 0,
    }));

    const payload = {
      nodes,
      links,
      totalTransitions: allTransitions.length,
      uniqueSessions: new Set(allTransitions.map(t => t.session_id)).size,
    };

    await cacheSet(cacheKey, payload, 120);
    res.json(payload);
  } catch (error: any) {
    logger.error("Analytics page-flow failed", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/top-entry-exit?websiteId=X&start=...&end=...
// Returns top entry and exit pages
router.get("/top-entry-exit", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, limit = "10" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const cacheKey = `analytics:entry-exit:${website.id}:${start}:${end}`;
    const cached = await cacheGet(cacheKey);
    if (cached != null) return res.json(cached);

    const startDate = new Date(start);
    const endDate = new Date(end);
    const websiteIds = websiteIdFilter(website);

    // Group events by session, ordered by time, to find first and last page per session
    const events = await prisma.events.findMany({
      where: {
        website_id: websiteIds,
        created_at: { gte: startDate, lte: endDate },
        url: { not: null },
        session_id: { not: null },
      },
      select: { session_id: true, url: true, created_at: true },
      orderBy: { created_at: "asc" },
    });

    const sessionPages: Record<string, Array<{ url: string; time: Date }>> = {};
    for (const e of events) {
      const sid = e.session_id!;
      if (!sessionPages[sid]) sessionPages[sid] = [];
      sessionPages[sid].push({ url: e.url!, time: e.created_at ?? new Date() });
    }

    const entryCounts: Record<string, number> = {};
    const exitCounts: Record<string, number> = {};

    for (const pages of Object.values(sessionPages)) {
      if (pages.length === 0) continue;
      const entry = pages[0].url;
      const exit = pages[pages.length - 1].url;
      entryCounts[entry] = (entryCounts[entry] || 0) + 1;
      exitCounts[exit] = (exitCounts[exit] || 0) + 1;
    }

    const topEntryPages = Object.entries(entryCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    const topExitPages = Object.entries(exitCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    const payload = {
      totalSessions: Object.keys(sessionPages).length,
      topEntryPages,
      topExitPages,
    };
    await cacheSet(cacheKey, payload, 120);
    res.json(payload);
  } catch (error: any) {
    logger.error("Analytics top-entry-exit failed", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/session-paths?websiteId=X&start=...&end=...&limit=20
// Returns the most common full session paths (sequences of page visits)
router.get("/session-paths", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, limit = "20" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const cacheKey = `analytics:session-paths:${website.id}:${start}:${end}`;
    const cached = await cacheGet(cacheKey);
    if (cached != null) return res.json(cached);

    const startDate = new Date(start);
    const endDate = new Date(end);
    const websiteIds = websiteIdFilter(website);

    const events = await prisma.events.findMany({
      where: {
        website_id: websiteIds,
        created_at: { gte: startDate, lte: endDate },
        url: { not: null },
        session_id: { not: null },
      },
      select: { session_id: true, url: true, created_at: true },
      orderBy: { created_at: "asc" },
    });

    // Build session paths
    const sessionPages: Record<string, string[]> = {};
    for (const e of events) {
      const sid = e.session_id!;
      if (!sessionPages[sid]) sessionPages[sid] = [];
      const lastPage = sessionPages[sid][sessionPages[sid].length - 1];
      if (lastPage !== e.url) {
        sessionPages[sid].push(e.url!);
      }
    }

    // Count path frequencies
    const pathCounts: Record<string, number> = {};
    for (const pages of Object.values(sessionPages)) {
      const pathKey = pages.join(" → ");
      pathCounts[pathKey] = (pathCounts[pathKey] || 0) + 1;
    }

    const paths = Object.entries(pathCounts)
      .map(([path, count]) => ({
        path,
        pages: path.split(" → "),
        count,
        depth: path.split(" → ").length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    const avgDepth = paths.length > 0
      ? Math.round(paths.reduce((sum, p) => sum + p.depth * p.count, 0) / paths.reduce((sum, p) => sum + p.count, 0) * 10) / 10
      : 0;

    const payload = {
      paths,
      totalSessions: Object.keys(sessionPages).length,
      avgPagesPerSession: avgDepth,
    };
    await cacheSet(cacheKey, payload, 120);
    res.json(payload);
  } catch (error: any) {
    logger.error("Analytics session-paths failed", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/page-stats?websiteId=X&start=...&end=...
// Returns detailed per-page statistics including avg time on page
router.get("/page-stats", async (req: Request, res: Response) => {
  try {
    const { websiteId, start, end, limit = "20" } = req.query as Record<string, string>;
    if (!websiteId || !start || !end) return res.status(400).json({ error: "Missing params" });

    const website = await resolveWebsiteWithAccess(websiteId, req.user.id);
    if (!website) return res.status(403).json({ error: "Access denied" });

    const cacheKey = `analytics:page-stats:${website.id}:${start}:${end}`;
    const cached = await cacheGet(cacheKey);
    if (cached != null) return res.json(cached);

    const startDate = new Date(start);
    const endDate = new Date(end);
    const websiteIds = websiteIdFilter(website);

    const events = await prisma.events.findMany({
      where: {
        website_id: websiteIds,
        created_at: { gte: startDate, lte: endDate },
        url: { not: null },
      },
      select: { url: true, session_id: true, duration: true },
    });

    const pageStats: Record<string, {
      views: number;
      sessions: Set<string>;
      totalDuration: number;
      durCount: number;
    }> = {};

    for (const e of events) {
      const url = (e.url || "/").trim() || "/";
      if (!pageStats[url]) {
        pageStats[url] = { views: 0, sessions: new Set(), totalDuration: 0, durCount: 0 };
      }
      pageStats[url].views += 1;
      if (e.session_id) pageStats[url].sessions.add(e.session_id);
      if (e.duration && e.duration > 0) {
        pageStats[url].totalDuration += e.duration;
        pageStats[url].durCount += 1;
      }
    }

    const totalViews = events.length;
    const pages = Object.entries(pageStats)
      .map(([page, s]) => ({
        page,
        views: s.views,
        uniqueVisitors: s.sessions.size,
        avgDuration: s.durCount > 0 ? Math.round(s.totalDuration / s.durCount) : 0,
        sharePercent: totalViews > 0 ? Math.round((s.views / totalViews) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, parseInt(limit));

    const payload = { pages, totalViews };
    await cacheSet(cacheKey, payload, 120);
    res.json(payload);
  } catch (error: any) {
    logger.error("Analytics page-stats failed", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export { router as analyticsRouter };
