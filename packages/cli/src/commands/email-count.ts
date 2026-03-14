import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output } from "../lib/output.js";

export function emailCountCommand() {
  return new Command("count")
    .description("Count emails")
    .option("--org <id|slug>", "Filter by organization")
    .option("--direction <dir>", "Filter: inbound or outbound")
    .option("--json", "Output as JSON")
    .action(async (opts: { org?: string; direction?: string; json?: boolean }) => {
      await withDb(async (prisma) => {
        const where: Record<string, unknown> = {};

        if (opts.org) {
          let org = await prisma.organization.findUnique({ where: { id: opts.org } });
          if (!org) org = await prisma.organization.findUnique({ where: { slug: opts.org } });
          if (!org) {
            console.error(`Organization not found: ${opts.org}`);
            process.exitCode = 1;
            return;
          }
          where.organization_id = org.id;
        }

        if (opts.direction) where.direction = opts.direction;

        const count = await prisma.email.count({ where });

        if (opts.json) {
          output({ count }, true);
        } else {
          console.log(`Email count: ${count}`);
        }
      });
    });
}
