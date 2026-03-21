import { Command } from "commander";

/**
 * Triggers POST /api/cron/run-site-audits with CRON_SECRET (same as other HTTP crons).
 */
export function cronRunSiteAuditsCommand() {
  return new Command("run-site-audits")
    .description("Enqueue daily scheduled Lighthouse audits for all websites (HTTP API)")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      const base = process.env.API_URL || process.env.APP_URL || "http://localhost:4000";
      const secret = process.env.CRON_SECRET || "";
      if (!secret) {
        console.error("CRON_SECRET is not set");
        process.exit(1);
      }
      const url = `${base.replace(/\/$/, "")}/api/cron/run-site-audits`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cron-Secret": secret,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(body?.error || res.statusText);
        process.exit(1);
      }
      if (opts.json) {
        console.log(JSON.stringify(body, null, 2));
      } else {
        console.log(`Enqueued: ${body.enqueued ?? 0}, skipped (already today): ${body.skippedAlreadyToday ?? 0}, websites: ${body.totalWebsites ?? 0}`);
        if (body.errors?.length) {
          console.log("Errors:");
          for (const e of body.errors) console.log(`  - ${e}`);
        }
      }
    });
}
