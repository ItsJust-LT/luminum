import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";

export function supportListCommand() {
  return new Command("list")
    .description("List support tickets")
    .option("--status <status>", "Filter: open, closed, resolved")
    .option("--org <id|slug>", "Filter by organization")
    .option("--limit <n>", "Max results", "50")
    .option("--json", "Output as JSON")
    .action(async (opts: { status?: string; org?: string; limit: string; json?: boolean }) => {
      await withDb(async (prisma) => {
        const where: Record<string, unknown> = {};

        if (opts.status) where.status = opts.status;

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

        const tickets = await prisma.support_tickets.findMany({
          where,
          take: parseInt(opts.limit, 10),
          orderBy: { created_at: "desc" },
          select: {
            id: true, ticket_number: true, title: true, status: true,
            priority: true, category: true, created_at: true,
          },
        });

        if (opts.json) {
          output(tickets, true);
        } else {
          printTable(
            tickets.map((t) => ({
              number: t.ticket_number,
              title: (t.title || "").slice(0, 30),
              status: t.status || "open",
              priority: t.priority || "medium",
              category: t.category || "",
              created: t.created_at?.toISOString().slice(0, 10) || "",
            })),
          );
        }
      });
    });
}
