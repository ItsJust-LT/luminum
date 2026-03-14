import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue } from "../lib/output.js";
import { resolveWebsite } from "../lib/resolve.js";

export function websiteShowCommand() {
  return new Command("show")
    .description("Show website details")
    .argument("<id|domain>", "Website ID or domain")
    .option("--json", "Output as JSON")
    .action(async (identifier: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const website = await resolveWebsite(prisma, identifier);
        if (!website) return;

        const org = await prisma.organization.findUnique({
          where: { id: website.organization_id },
          select: { name: true, slug: true },
        });

        const eventCount = await prisma.events.count({ where: { website_id: website.id } });
        const formCount = await prisma.form_submissions.count({ where: { website_id: website.id } });

        if (opts.json) {
          output({ ...website, organization: org, eventCount, formSubmissionCount: formCount }, true);
        } else {
          printKeyValue({
            id: website.id,
            domain: website.domain,
            name: website.name || "(none)",
            organization: org ? `${org.name} (${org.slug})` : website.organization_id,
            analytics: website.analytics ? "enabled" : "disabled",
            events: eventCount,
            form_submissions: formCount,
            created: website.created_at?.toISOString() || "",
          });
        }
      });
    });
}
