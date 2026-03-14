import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveOrg } from "../lib/resolve.js";

export function orgUpdateCommand() {
  return new Command("update")
    .description("Update an organization")
    .argument("<id|slug>", "Organization ID or slug")
    .option("--name <name>", "New name")
    .option("--slug <slug>", "New slug")
    .option("--billing-email <email>", "Billing email")
    .option("--subscription-status <status>", "Subscription status")
    .option("--currency <code>", "Currency code")
    .option("--country <country>", "Country name")
    .action(async (identifier: string, opts: {
      name?: string; slug?: string; billingEmail?: string;
      subscriptionStatus?: string; currency?: string; country?: string;
    }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        const data: Record<string, unknown> = {};
        if (opts.name) data.name = opts.name;
        if (opts.slug) data.slug = opts.slug;
        if (opts.billingEmail) data.billing_email = opts.billingEmail;
        if (opts.subscriptionStatus) data.subscription_status = opts.subscriptionStatus;
        if (opts.currency) data.currency = opts.currency;
        if (opts.country) data.country = opts.country;

        if (Object.keys(data).length === 0) {
          console.log("No fields to update. Use --name, --slug, --billing-email, etc.");
          return;
        }

        await prisma.organization.update({ where: { id: org.id }, data });
        console.log(`Organization "${org.name}" updated.`);
      });
    });
}
