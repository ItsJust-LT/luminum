import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";

export function orgListCommand() {
  return new Command("list")
    .description("List organizations")
    .option("--limit <n>", "Max results", "50")
    .option("--slug <slug>", "Filter by slug")
    .option("--status <status>", "Filter by subscription_status (active, trialing, past_due)")
    .option("--json", "Output as JSON")
    .action(async (opts: { limit: string; slug?: string; status?: string; json?: boolean }) => {
      await withDb(async (prisma) => {
        const where: Record<string, unknown> = {};
        if (opts.slug) where.slug = opts.slug;
        if (opts.status) where.subscription_status = opts.status;

        const orgs = await prisma.organization.findMany({
          where,
          take: parseInt(opts.limit, 10),
          orderBy: { createdAt: "desc" },
          select: {
            id: true, name: true, slug: true, subscription_status: true,
            emails_enabled: true, createdAt: true,
          },
        });

        if (opts.json) {
          output(orgs, true);
        } else {
          printTable(
            orgs.map((o) => ({
              id: o.id.slice(0, 12) + "…",
              name: o.name,
              slug: o.slug,
              status: o.subscription_status || "active",
              email: o.emails_enabled ? "YES" : "",
              created: o.createdAt.toISOString().slice(0, 10),
            })),
          );
        }
      });
    });
}
