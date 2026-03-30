import { logger } from "./logger.js";
import { runEmailDnsVerification } from "./cron-verify-email-dns.js";
import { syncSesInboundReceiptRules } from "./ses-receipt-rules.js";

/**
 * In-process periodic email DNS / SES checks (same logic as POST /api/cron/verify-email-dns).
 * Enable with EMAIL_DNS_PERIODIC_CHECK_MS (e.g. 21600000 for 6 hours). Omit or 0 to disable.
 * When SES_INBOUND_LAMBDA_ARN is set, also runs syncSesInboundReceiptRules on the same interval
 * so new org domains get added to the SES receipt rule without a manual Register click only.
 */
export function startEmailDnsPeriodicScheduler(): void {
  const raw = (process.env.EMAIL_DNS_PERIODIC_CHECK_MS || "").trim();
  const ms = parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 60_000) {
    return;
  }

  const syncReceiptRulesIfConfigured = () => {
    const arn = (process.env.SES_INBOUND_LAMBDA_ARN || "").trim();
    if (!arn) return;
    syncSesInboundReceiptRules()
      .then((r) => {
        if (r.skipped) return;
        if (r.ok) {
          logger.info("Periodic SES receipt rule sync finished", { domainCount: r.domainCount });
        } else {
          logger.warn("Periodic SES receipt rule sync failed", { error: r.error });
        }
      })
      .catch((err) => {
        logger.warn("Periodic SES receipt rule sync threw", { error: String(err) });
      });
  };

  const tick = () => {
    syncReceiptRulesIfConfigured();
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
