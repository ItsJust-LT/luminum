import { logger } from "./logger.js";
import { runScheduledEmailOutbox } from "./cron-send-scheduled-emails.js";

const DEFAULT_POLL_MS = 60_000;

/**
 * Poll for due scheduled outbound emails.
 * Defaults to 60s when SCHEDULED_EMAIL_POLL_MS is unset (set to 0 to disable in-process polling only).
 * You can still use POST /api/cron/send-scheduled-emails from an external scheduler.
 */
export function startScheduledEmailPoller(): void {
  const raw = (process.env.SCHEDULED_EMAIL_POLL_MS || "").trim();
  let ms: number;
  if (raw === "") {
    ms = DEFAULT_POLL_MS;
  } else {
    const parsed = parseInt(raw, 10);
    if (raw === "0" || parsed === 0) return;
    ms = parsed;
  }
  if (!Number.isFinite(ms) || ms < 10_000) return;

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
