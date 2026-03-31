import { logger } from "./logger.js";
import { runScheduledInvoices } from "./cron-invoice-schedules.js";

const DEFAULT_MS = 60_000;

/**
 * Poll for due invoice schedules (clone template, PDF, email/WhatsApp, mark sent).
 * INVOICE_SCHEDULE_POLL_MS defaults to 60000; set to 0 to disable in-process polling.
 * External cron: POST /api/cron/run-invoice-schedules with CRON_SECRET.
 */
export function startInvoiceSchedulePoller(): void {
  const raw = (process.env.INVOICE_SCHEDULE_POLL_MS || "").trim();
  let ms: number;
  if (raw === "") {
    ms = DEFAULT_MS;
  } else {
    const parsed = parseInt(raw, 10);
    if (raw === "0" || parsed === 0) return;
    ms = parsed;
  }
  if (!Number.isFinite(ms) || ms < 15_000) return;

  const tick = () => {
    runScheduledInvoices()
      .then((r) => {
        if (r.succeeded > 0) {
          logger.info("Invoice schedules processed", {
            processed: r.processed,
            succeeded: r.succeeded,
            errors: r.errors.length,
          });
        }
      })
      .catch((err) => {
        logger.warn("Invoice schedule poll failed", { error: String(err) });
      });
  };

  tick();
  setInterval(tick, ms);
  logger.info("Invoice schedule poller started", { intervalMs: ms });
}
