import type { PrismaClient } from "@luminum/database";
import { logger } from "../lib/logger.js";
import { enqueueAuditReplacing } from "./queue.js";

const RUNNING_STALE_MS = parseInt(process.env.AUDIT_STALE_RUNNING_MS ?? String(90 * 60 * 1000), 10);
const QUEUED_STALE_MS = parseInt(process.env.AUDIT_STALE_QUEUED_MS ?? String(6 * 60 * 60 * 1000), 10);

/**
 * Clears zombie rows: running without a finishing worker, or queued without ever starting.
 * Called from the daily cron and on audit-worker startup.
 */
export async function recoverStaleSiteAudits(prisma: PrismaClient): Promise<{
  runningMarkedFailed: number;
  queuedRequeued: number;
  queuedMarkedFailed: number;
}> {
  const now = new Date();
  const runningCutoff = new Date(now.getTime() - RUNNING_STALE_MS);
  const queuedCutoff = new Date(now.getTime() - QUEUED_STALE_MS);

  const staleRunning = await prisma.website_audit.findMany({
    where: {
      status: "running",
      started_at: { lt: runningCutoff },
    },
    select: { id: true },
  });

  const runningIds = staleRunning.map((r) => r.id);
  if (runningIds.length) {
    await prisma.website_audit.updateMany({
      where: { id: { in: runningIds } },
      data: {
        status: "failed",
        completed_at: now,
        error_message: `Stale: no completion after ${Math.round(RUNNING_STALE_MS / 60000)}m (worker restart or Lighthouse hang). Retry from the dashboard.`,
      },
    });
  }

  const staleQueued = await prisma.website_audit.findMany({
    where: {
      status: "queued",
      created_at: { lt: queuedCutoff },
    },
    select: {
      id: true,
      website_id: true,
      target_url: true,
      form_factor: true,
    },
  });

  let queuedRequeued = 0;
  let queuedMarkedFailed = 0;
  for (const row of staleQueued) {
    const jobId = await enqueueAuditReplacing({
      auditId: row.id,
      websiteId: row.website_id,
      targetUrl: row.target_url,
      formFactor: row.form_factor === "desktop" ? "desktop" : "mobile",
    });
    if (jobId) {
      queuedRequeued++;
    } else {
      await prisma.website_audit.update({
        where: { id: row.id },
        data: {
          status: "failed",
          completed_at: now,
          error_message: "Stale queued audit: Redis queue unavailable; cannot re-enqueue.",
        },
      });
      queuedMarkedFailed++;
    }
  }

  if (runningIds.length || staleQueued.length) {
    logger.info("recoverStaleSiteAudits", {
      runningMarkedFailed: runningIds.length,
      queuedRequeued,
      queuedMarkedFailed,
      staleQueuedCount: staleQueued.length,
    });
  }

  return {
    runningMarkedFailed: runningIds.length,
    queuedRequeued,
    queuedMarkedFailed,
  };
}
