import { Command } from "commander";

const CRON_JOBS = [
  {
    name: "verify-email-dns",
    description: "Re-check MX records for all organizations with email enabled. Disables email for orgs whose MX no longer resolves.",
    usage: "luminum cron verify-email-dns",
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
