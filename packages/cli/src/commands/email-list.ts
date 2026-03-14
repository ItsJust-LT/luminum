import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";

export function emailListCommand() {
  return new Command("list")
    .description("List emails")
    .option("--org <id|slug>", "Filter by organization")
    .option("--direction <dir>", "Filter: inbound or outbound")
    .option("--since <date>", "Only emails after this ISO date")
    .option("--limit <n>", "Max results", "50")
    .option("--json", "Output as JSON")
    .action(async (opts: { org?: string; direction?: string; since?: string; limit: string; json?: boolean }) => {
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
        if (opts.since) where.receivedAt = { gte: new Date(opts.since) };

        const emails = await prisma.email.findMany({
          where,
          take: parseInt(opts.limit, 10),
          orderBy: { receivedAt: "desc" },
          select: {
            id: true, from: true, to: true, subject: true,
            direction: true, read: true, receivedAt: true,
          },
        });

        if (opts.json) {
          output(emails, true);
        } else {
          printTable(
            emails.map((e) => ({
              id: e.id.slice(0, 10) + "…",
              dir: e.direction.slice(0, 3),
              from: (e.from || "").slice(0, 25),
              to: (e.to || "").slice(0, 25),
              subject: (e.subject || "").slice(0, 30),
              read: e.read ? "Y" : "",
              date: e.receivedAt?.toISOString().slice(0, 16) || "",
            })),
          );
        }
      });
    });
}
