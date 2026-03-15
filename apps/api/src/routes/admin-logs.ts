import { Router, Request, Response } from "express";
import { requireAuth, optionalAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { persistLog } from "../lib/log-store.js";
import { logger } from "../lib/logger.js";

const router = Router();

function adminOnly(req: Request, res: Response, next: () => void) {
  if ((req as any).user?.role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

/** GET /api/admin/logs?page=1&limit=50&service=api&level=error&since=ISO */
router.get("/", requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const service = req.query.service as string | undefined;
    const level = req.query.level as string | undefined;
    const since = req.query.since as string | undefined;

    const where: Record<string, unknown> = {};
    if (service) where.service = service;
    if (level) where.level = level;
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(d.getTime())) where.created_at = { gte: d };
    }

    const [logs, total] = await Promise.all([
      prisma.system_logs.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.system_logs.count({ where }),
    ]);

    const items = logs.map((l) => ({
      id: l.id,
      created_at: l.created_at.toISOString(),
      service: l.service,
      level: l.level,
      message: l.message,
      meta: l.meta,
      request_id: l.request_id,
    }));

    res.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const reqWithId = req as Request & { requestId?: string };
    logger.logError(error, "Admin logs list failed", { path: "/api/admin/logs" }, reqWithId.requestId);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to fetch logs" });
  }
});

/** POST /api/admin/logs/ingest — ingest from dashboard/analytics (admin or service secret). */
router.post("/ingest", optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const secret = req.headers["x-log-secret"] as string | undefined;
    const canIngest = user?.role === "admin" || (process.env.LOG_INGEST_SECRET && secret === process.env.LOG_INGEST_SECRET);
    if (!canIngest) {
      res.status(403).json({ success: false, error: "Admin or valid LOG_INGEST_SECRET required" });
      return;
    }

    const body = req.body as { service?: string; level?: string; message?: string; meta?: Record<string, unknown> };
    const service = (body.service || "dashboard").slice(0, 64);
    const level = (body.level || "info").toLowerCase();
    const message = typeof body.message === "string" ? body.message : "No message";
    const meta = body.meta && typeof body.meta === "object" ? body.meta : undefined;

    if (!["info", "warn", "error", "debug"].includes(level)) {
      res.status(400).json({ success: false, error: "Invalid level" });
      return;
    }

    persistLog({
      service,
      level: level as "info" | "warn" | "error" | "debug",
      message,
      meta,
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const reqWithId = req as Request & { requestId?: string };
    logger.logError(error, "Admin logs ingest failed", { path: "/api/admin/logs/ingest" }, reqWithId.requestId);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to ingest log" });
  }
});

export { router as adminLogsRouter };
