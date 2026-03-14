import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";
import { resolveOrg } from "../lib/resolve.js";

export function orgWebsitesCommand() {
  return new Command("websites")
    .description("List websites for an organization")
    .argument("<id|slug>", "Organization ID or slug")
    .option("--json", "Output as JSON")
    .action(async (identifier: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        const websites = await prisma.websites.findMany({
          where: { organization_id: org.id },
          select: { id: true, domain: true, name: true, analytics: true, created_at: true },
        });

        if (opts.json) {
          output(websites, true);
        } else {
          console.log(`Websites for "${org.name}":\n`);
          printTable(
            websites.map((w) => ({
              id: w.id.slice(0, 12) + "…",
              domain: w.domain,
              name: w.name || "",
              analytics: w.analytics ? "YES" : "",
              created: w.created_at?.toISOString().slice(0, 10) || "",
            })),
          );
        }
      });
    });
}
