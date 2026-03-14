import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { getOnlineUserIds } from "../lib/realtime-ws.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
  next();
}
router.use(adminOnly);

// GET /api/admin/activity/overview
router.get("/overview", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    const onlineNow = getOnlineUserIds().length;

    const [todaySessions, todayAggregate, weekAggregate, monthAggregate] = await Promise.all([
      prisma.dashboard_activity.count({ where: { date: { gte: todayStart } } }),
      prisma.dashboard_activity.aggregate({ where: { date: { gte: todayStart } }, _sum: { duration_ms: true }, _avg: { duration_ms: true } }),
      prisma.dashboard_activity.aggregate({ where: { date: { gte: weekAgo } }, _sum: { duration_ms: true }, _avg: { duration_ms: true }, _count: true }),
      prisma.dashboard_activity.aggregate({ where: { date: { gte: monthAgo } }, _sum: { duration_ms: true }, _avg: { duration_ms: true }, _count: true }),
    ]);

    const uniqueUsersToday = await prisma.dashboard_activity.groupBy({
      by: ["user_id"],
      where: { date: { gte: todayStart } },
    });

    res.json({
      success: true,
      overview: {
        online_now: onlineNow,
        active_today: uniqueUsersToday.length,
        sessions_today: todaySessions,
        total_time_today_ms: todayAggregate._sum.duration_ms || 0,
        avg_session_today_ms: Math.round(todayAggregate._avg.duration_ms || 0),
        total_time_week_ms: weekAggregate._sum.duration_ms || 0,
        avg_session_week_ms: Math.round(weekAggregate._avg.duration_ms || 0),
        sessions_week: weekAggregate._count || 0,
        total_time_month_ms: monthAggregate._sum.duration_ms || 0,
        sessions_month: monthAggregate._count || 0,
      },
    });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// GET /api/admin/activity/users?period=day|week|month&search=&limit=50&offset=0
router.get("/users", async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "week";
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let sinceDate: Date;
    switch (period) {
      case "day": sinceDate = todayStart; break;
      case "month": sinceDate = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: sinceDate = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const onlineIds = new Set(getOnlineUserIds());

    const userWhere: any = {};
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, email: true, image: true, role: true, lastSeenAt: true, createdAt: true },
      orderBy: { lastSeenAt: "desc" },
      take: limit,
      skip: offset,
    });

    const totalUsers = await prisma.user.count({ where: userWhere });

    const userIds = users.map((u) => u.id);
    const activityAgg = await prisma.dashboard_activity.groupBy({
      by: ["user_id"],
      where: { user_id: { in: userIds }, date: { gte: sinceDate } },
      _sum: { duration_ms: true },
      _avg: { duration_ms: true },
      _count: true,
    });

    const activityMap = new Map(activityAgg.map((a) => [a.user_id, a]));

    const result = users.map((u) => {
      const activity = activityMap.get(u.id);
      return {
        ...u,
        is_online: onlineIds.has(u.id),
        total_time_ms: activity?._sum.duration_ms || 0,
        avg_session_ms: Math.round(activity?._avg.duration_ms || 0),
        session_count: activity?._count || 0,
      };
    });

    res.json({ success: true, users: result, total: totalUsers, limit, offset, period });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// GET /api/admin/activity/user/:userId
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const period = (req.query.period as string) || "month";

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let sinceDate: Date;
    switch (period) {
      case "day": sinceDate = todayStart; break;
      case "week": sinceDate = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      default: sinceDate = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, role: true, lastSeenAt: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const isOnline = getOnlineUserIds().includes(userId);

    const sessions = await prisma.dashboard_activity.findMany({
      where: { user_id: userId, date: { gte: sinceDate } },
      orderBy: { session_start: "desc" },
      take: 100,
    });

    const aggregate = await prisma.dashboard_activity.aggregate({
      where: { user_id: userId, date: { gte: sinceDate } },
      _sum: { duration_ms: true },
      _avg: { duration_ms: true },
      _count: true,
    });

    const dailyActivity = await prisma.dashboard_activity.groupBy({
      by: ["date"],
      where: { user_id: userId, date: { gte: sinceDate } },
      _sum: { duration_ms: true },
      _count: true,
      orderBy: { date: "asc" },
    });

    res.json({
      success: true,
      user: { ...user, is_online: isOnline },
      summary: {
        total_time_ms: aggregate._sum.duration_ms || 0,
        avg_session_ms: Math.round(aggregate._avg.duration_ms || 0),
        session_count: aggregate._count || 0,
      },
      daily_activity: dailyActivity.map((d) => ({
        date: d.date,
        total_time_ms: d._sum.duration_ms || 0,
        session_count: d._count,
      })),
      recent_sessions: sessions,
    });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export { router as adminActivityRouter };
