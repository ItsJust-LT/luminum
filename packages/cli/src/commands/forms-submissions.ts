import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";

export function formsSubmissionsCommand() {
  return new Command("submissions")
    .description("List form submissions")
    .option("--website-id <id>", "Filter by website ID")
    .option("--limit <n>", "Max results", "50")
    .option("--json", "Output as JSON")
    .action(async (opts: { websiteId?: string; limit: string; json?: boolean }) => {
      await withDb(async (prisma) => {
        const where: Record<string, unknown> = {};
        if (opts.websiteId) where.website_id = opts.websiteId;

        const submissions = await prisma.form_submissions.findMany({
          where,
          take: parseInt(opts.limit, 10),
          orderBy: { submitted_at: "desc" },
          include: { websites: { select: { domain: true } } },
        });

        if (opts.json) {
          output(submissions, true);
        } else {
          printTable(
            submissions.map((s) => ({
              id: s.id.slice(0, 12) + "…",
              website: s.websites.domain,
              seen: s.seen ? "Y" : "",
              contacted: s.contacted ? "Y" : "",
              submitted: s.submitted_at.toISOString().slice(0, 16),
              fields: Object.keys(s.data as Record<string, unknown>).length,
            })),
          );
        }
      });
    });
}
