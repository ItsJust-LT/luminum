import { Command } from "commander";

const CRON_JOBS = [
  {
    name: "verify-email-dns",
    description: "Re-check MX/SPF/DKIM/DMARC for orgs with email enabled. Marks setup as failed (clears verified_at) if DNS fails; does not change access.",
    usage: "POST /api/cron/verify-email-dns (X-Cron-Secret) or luminum cron verify-email-dns",
  },
  {
    name: "verify-analytics-script",
    description: "Check that tracking script (script.js?websiteId=...) is present on each website with analytics enabled. Updates script_last_verified_at / script_last_error.",
    usage: "POST /api/cron/verify-analytics-script (X-Cron-Secret)",
  },
  {
    name: "run-site-audits",
    description: "Enqueue one mobile homepage Lighthouse audit per website per UTC day (skipped if already scheduled today). Requires Redis, BullMQ queue, and audit-worker process.",
    usage: "POST /api/cron/run-site-audits (X-Cron-Secret) or pnpm run cli -- cron run-site-audits",
  },
];

export function cronListCommand() {
  return new Command("list")
    .description("List available cron jobs")
    .action(() => {
      console.log("Available cron jobs:\n");
      for (const job of CRON_JOBS) {
        console.log(`  ${job.name}`);
        console.log(`    ${job.description}`);
        console.log(`    Usage: ${job.usage}`);
        console.log();
      }
    });
}
