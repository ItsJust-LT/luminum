import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveOrg } from "../lib/resolve.js";

export function orgDisableEmailCommand() {
  return new Command("disable-email")
    .description("Disable email for an organization")
    .argument("<id|slug>", "Organization ID or slug")
    .action(async (identifier: string) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        if (!org.emails_enabled) {
          console.log(`Email is already disabled for "${org.name}".`);
          return;
        }

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            emails_enabled: false,
            email_domain_id: null,
            email_dns_verified_at: null,
            email_dns_last_check_at: null,
            email_dns_last_error: null,
            email_from_address: null,
          },
        });

        console.log(`Email disabled for "${org.name}".`);
      });
    });
}
