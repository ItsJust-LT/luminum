import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output } from "../lib/output.js";

export function formsCountCommand() {
  return new Command("count")
    .description("Count form submissions")
    .option("--website-id <id>", "Filter by website ID")
    .option("--json", "Output as JSON")
    .action(async (opts: { websiteId?: string; json?: boolean }) => {
      await withDb(async (prisma) => {
        const where: Record<string, unknown> = {};
        if (opts.websiteId) where.website_id = opts.websiteId;

        const count = await prisma.form_submissions.count({ where });

        if (opts.json) {
          output({ count }, true);
        } else {
          console.log(`Form submissions: ${count}`);
        }
      });
    });
}
