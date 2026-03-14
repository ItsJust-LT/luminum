import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";

export function websiteListCommand() {
  return new Command("list")
    .description("List websites")
    .option("--org <id|slug>", "Filter by organization ID or slug")
    .option("--limit <n>", "Max results", "50")
    .option("--json", "Output as JSON")
    .action(async (opts: { org?: string; limit: string; json?: boolean }) => {
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

        const websites = await prisma.websites.findMany({
          where,
          take: parseInt(opts.limit, 10),
          orderBy: { created_at: "desc" },
          include: { organization: { select: { name: true, slug: true } } },
        });

        if (opts.json) {
          output(websites, true);
        } else {
          printTable(
            websites.map((w) => ({
              domain: w.domain,
              name: w.name || "",
              org: w.organization.slug,
              analytics: w.analytics ? "YES" : "",
              created: w.created_at?.toISOString().slice(0, 10) || "",
            })),
          );
        }
      });
    });
}
