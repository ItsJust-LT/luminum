import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";

export function subscriptionListCommand() {
  return new Command("list")
    .description("List subscriptions")
    .option("--org <id|slug>", "Filter by organization")
    .option("--status <status>", "Filter by status (active, canceled, trialing, past_due)")
    .option("--limit <n>", "Max results", "50")
    .option("--json", "Output as JSON")
    .action(async (opts: { org?: string; status?: string; limit: string; json?: boolean }) => {
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

        if (opts.status) where.status = opts.status;

        const subs = await prisma.subscriptions.findMany({
          where,
          take: parseInt(opts.limit, 10),
          orderBy: { created_at: "desc" },
          include: { organization_subscriptions_organization_idToorganization: { select: { name: true, slug: true } } },
        });

        if (opts.json) {
          output(subs, true);
        } else {
          printTable(
            subs.map((s) => ({
              id: s.id.slice(0, 12) + "…",
              org: s.organization_subscriptions_organization_idToorganization.slug,
              plan: s.plan_name || "",
              type: s.type,
              status: s.status,
              provider: s.provider,
            })),
          );
        }
      });
    });
}
