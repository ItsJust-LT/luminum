import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { collectServerMetrics } from "../lib/server-metrics.js";
import * as s3 from "../lib/storage/s3.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: Request, res: Response, next: () => void) {
  if ((req as any).user?.role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

export interface StorageBreakdown {
  database_bytes: number | null;
  s3_bytes: number | null;
  database_error?: string;
  s3_error?: string;
}

async function getStorageBreakdown(
  diskUsedBytes: number | null,
  diskTotalBytes: number | null
): Promise<StorageBreakdown> {
  let database_bytes: number | null = null;
  let database_error: string | undefined;
  let s3_bytes: number | null = null;
  let s3_error: string | undefined;
  try {
    const rows = await prisma.$queryRawUnsafe<[{ pg_database_size: bigint | null }]>(
      "SELECT pg_database_size(current_database()) AS pg_database_size"
    );
    if (rows?.[0]?.pg_database_size != null) database_bytes = Number(rows[0].pg_database_size);
  } catch (e: unknown) {
    database_error = e instanceof Error ? e.message : String(e);
  }
  if (s3.isStorageConfigured()) {
    try {
      s3_bytes = await s3.getBucketSize();
    } catch (e: unknown) {
      s3_error = e instanceof Error ? e.message : String(e);
    }
  }
  return { database_bytes, s3_bytes, database_error, s3_error };
}

/** GET /api/admin/monitoring/metrics — current snapshot + history (last 24h). Records current to DB. */
router.get("/metrics", adminOnly, async (_req: Request, res: Response) => {
  try {
    const current = await collectServerMetrics();
    const storageBreakdown = await getStorageBreakdown(current.disk_used_bytes, current.disk_total_bytes);

    const row = await prisma.server_metrics.create({
      data: {
        hostname: current.hostname,
        platform: current.platform,
        node_version: current.node_version,
        cpu_usage_percent: current.cpu_usage_percent,
        cpu_cores: current.cpu_cores,
        memory_used_bytes: BigInt(current.memory_used_bytes),
        memory_total_bytes: BigInt(current.memory_total_bytes),
        memory_usage_percent: current.memory_usage_percent,
        process_heap_used_bytes: BigInt(current.process_heap_used_bytes),
        process_heap_total_bytes: BigInt(current.process_heap_total_bytes),
        process_rss_bytes: BigInt(current.process_rss_bytes),
        system_uptime_seconds: current.system_uptime_seconds,
        process_uptime_seconds: current.process_uptime_seconds,
        load_avg_1m: current.load_avg_1m,
        load_avg_5m: current.load_avg_5m,
        load_avg_15m: current.load_avg_15m,
        disk_used_bytes: current.disk_used_bytes != null ? BigInt(current.disk_used_bytes) : null,
        disk_total_bytes: current.disk_total_bytes != null ? BigInt(current.disk_total_bytes) : null,
        disk_usage_percent: current.disk_usage_percent,
      },
    });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const history = await prisma.server_metrics.findMany({
      where: { created_at: { gte: since } },
      orderBy: { created_at: "asc" },
      take: 1000,
    });

    const serialize = (r: any) => ({
      id: r.id,
      created_at: r.created_at.toISOString(),
      hostname: r.hostname,
      platform: r.platform,
      node_version: r.node_version,
      cpu_usage_percent: r.cpu_usage_percent,
      cpu_cores: r.cpu_cores,
      memory_used_bytes: r.memory_used_bytes != null ? Number(r.memory_used_bytes) : null,
      memory_total_bytes: r.memory_total_bytes != null ? Number(r.memory_total_bytes) : null,
      memory_usage_percent: r.memory_usage_percent,
      process_heap_used_bytes: r.process_heap_used_bytes != null ? Number(r.process_heap_used_bytes) : null,
      process_heap_total_bytes: r.process_heap_total_bytes != null ? Number(r.process_heap_total_bytes) : null,
      process_rss_bytes: r.process_rss_bytes != null ? Number(r.process_rss_bytes) : null,
      system_uptime_seconds: r.system_uptime_seconds,
      process_uptime_seconds: r.process_uptime_seconds,
      load_avg_1m: r.load_avg_1m,
      load_avg_5m: r.load_avg_5m,
      load_avg_15m: r.load_avg_15m,
      disk_used_bytes: r.disk_used_bytes != null ? Number(r.disk_used_bytes) : null,
      disk_total_bytes: r.disk_total_bytes != null ? Number(r.disk_total_bytes) : null,
      disk_usage_percent: r.disk_usage_percent,
    });

    res.json({
      success: true,
      current: {
        ...current,
        id: row.id,
        created_at: row.created_at.toISOString(),
        storage_breakdown: storageBreakdown,
      },
      history: history.map(serialize),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to collect metrics" });
  }
});

/** POST /api/admin/monitoring/record — record current snapshot only (e.g. for cron). */
router.post("/record", adminOnly, async (_req: Request, res: Response) => {
  try {
    const current = await collectServerMetrics();
    await prisma.server_metrics.create({
      data: {
        hostname: current.hostname,
        platform: current.platform,
        node_version: current.node_version,
        cpu_usage_percent: current.cpu_usage_percent,
        cpu_cores: current.cpu_cores,
        memory_used_bytes: BigInt(current.memory_used_bytes),
        memory_total_bytes: BigInt(current.memory_total_bytes),
        memory_usage_percent: current.memory_usage_percent,
        process_heap_used_bytes: BigInt(current.process_heap_used_bytes),
        process_heap_total_bytes: BigInt(current.process_heap_total_bytes),
        process_rss_bytes: BigInt(current.process_rss_bytes),
        system_uptime_seconds: current.system_uptime_seconds,
        process_uptime_seconds: current.process_uptime_seconds,
        load_avg_1m: current.load_avg_1m,
        load_avg_5m: current.load_avg_5m,
        load_avg_15m: current.load_avg_15m,
        disk_used_bytes: current.disk_used_bytes != null ? BigInt(current.disk_used_bytes) : null,
        disk_total_bytes: current.disk_total_bytes != null ? BigInt(current.disk_total_bytes) : null,
        disk_usage_percent: current.disk_usage_percent,
      },
    });
    res.json({ success: true, message: "Recorded" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to record metrics" });
  }
});

export { router as adminMonitoringRouter };
