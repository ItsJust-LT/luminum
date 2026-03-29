import { logger } from "./logger.js";
import { runScheduledSiteAudits } from "./cron-scheduled-site-audits.js";

/**
 * In-process periodic scheduled site audits (same logic as POST /api/cron/run-site-audits).
 * Enable with SITE_AUDITS_PERIODIC_CHECK_MS (e.g. 86400000 for ~24h). Omit or 0 to disable.
 */
export function startSiteAuditsPeriodicScheduler(): void {
  const raw = (process.env.SITE_AUDITS_PERIODIC_CHECK_MS || "").trim();
  const ms = parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 60_000) {
    return;
  }

  const tick = () => {
    runScheduledSiteAudits()
      .then((r) => {
        logger.info("Periodic scheduled site audits finished", {
          totalWebsites: r.totalWebsites,
          enqueued: r.enqueued,
          skippedAlreadyToday: r.skippedAlreadyToday,
          errorCount: r.errors.length,
        });
      })
      .catch((err) => {
        logger.warn("Periodic scheduled site audits failed", { error: String(err) });
      });
  };

  setInterval(tick, ms);
  logger.info("Site audits periodic scheduler started", { intervalMs: ms });
}
