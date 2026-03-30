import { logger } from "./logger.js";
import { runScheduledEmailOutbox } from "./cron-send-scheduled-emails.js";

/**
 * Poll for due scheduled outbound emails. Set SCHEDULED_EMAIL_POLL_MS (e.g. 60000). Omit or 0 to disable in-process polling
 * (you can still use POST /api/cron/send-scheduled-emails from an external scheduler).
 */
export function startScheduledEmailPoller(): void {
  const raw = (process.env.SCHEDULED_EMAIL_POLL_MS || "").trim();
  const ms = parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 10_000) {
    return;
  }

  const tick = () => {
    runScheduledEmailOutbox()
      .then((r) => {
        if (r.sent > 0) {
          logger.info("Scheduled email poll delivered", { sent: r.sent, processed: r.processed });
        }
      })
      .catch((err) => {
        logger.warn("Scheduled email poll failed", { error: String(err) });
      });
  };

  tick();
  setInterval(tick, ms);
  logger.info("Scheduled email poller started", { intervalMs: ms });
}
