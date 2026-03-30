import { logger } from "./logger.js";
import { runEmailDnsVerification } from "./cron-verify-email-dns.js";

/**
 * In-process periodic email checks (same logic as POST /api/cron/verify-email-dns).
 * Enable with EMAIL_DNS_PERIODIC_CHECK_MS (e.g. 21600000 for 6 hours). Omit or 0 to disable.
 */
export function startEmailDnsPeriodicScheduler(): void {
  const raw = (process.env.EMAIL_DNS_PERIODIC_CHECK_MS || "").trim();
  const ms = parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 60_000) {
    return;
  }

  const tick = () => {
    runEmailDnsVerification()
      .then((r) => {
        logger.info("Periodic email DNS verification finished", {
          checked: r.checked,
          disabled: r.disabled,
          errorCount: r.errors.length,
        });
      })
      .catch((err) => {
        logger.warn("Periodic email DNS verification failed", { error: String(err) });
      });
  };

  setInterval(tick, ms);
  logger.info("Email DNS periodic scheduler started", { intervalMs: ms });
}
