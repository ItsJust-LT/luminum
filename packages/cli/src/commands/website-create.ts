import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveOrg } from "../lib/resolve.js";

export function websiteCreateCommand() {
  return new Command("create")
    .description("Create a new website")
    .requiredOption("--org <id|slug>", "Organization ID or slug")
    .requiredOption("--domain <domain>", "Website domain")
    .option("--name <name>", "Display name")
    .option("--analytics", "Enable analytics")
    .option("--json", "Output as JSON")
    .action(async (opts: { org: string; domain: string; name?: string; analytics?: boolean; json?: boolean }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, opts.org);
        if (!org) return;

        const existing = await prisma.websites.findUnique({ where: { domain: opts.domain } });
        if (existing) {
          console.error(`Website with domain "${opts.domain}" already exists.`);
          process.exitCode = 1;
          return;
        }

        const website = await prisma.websites.create({
          data: {
            domain: opts.domain,
            name: opts.name || opts.domain,
            organization_id: org.id,
            analytics: opts.analytics || false,
          },
        });

        if (opts.json) {
          console.log(JSON.stringify(website, null, 2));
        } else {
          console.log(`Website created: ${website.domain}`);
          console.log(`ID: ${website.id}`);
        }
      });
    });
}
