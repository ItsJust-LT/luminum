import { Command } from "commander";
import { withDb } from "../lib/db.js";
import crypto from "node:crypto";

export function orgCreateCommand() {
  return new Command("create")
    .description("Create a new organization")
    .requiredOption("--name <name>", "Organization name")
    .requiredOption("--slug <slug>", "Organization slug (unique)")
    .option("--owner-email <email>", "Assign existing user as owner")
    .option("--domain <domain>", "Create an initial website with this domain")
    .option("--currency <code>", "Currency code", "ZAR")
    .option("--country <country>", "Country name", "South Africa")
    .option("--subscription-type <type>", "Subscription type: free, trial, paid", "free")
    .option("--trial-days <days>", "Trial duration in days (only for trial type)")
    .option("--json", "Output as JSON")
    .action(async (opts: {
      name: string; slug: string; ownerEmail?: string; domain?: string;
      currency: string; country: string; subscriptionType: string;
      trialDays?: string; json?: boolean;
    }) => {
      await withDb(async (prisma) => {
        const existing = await prisma.organization.findUnique({ where: { slug: opts.slug } });
        if (existing) {
          console.error(`Organization with slug "${opts.slug}" already exists.`);
          process.exitCode = 1;
          return;
        }

        const orgId = crypto.randomUUID();
        const org = await prisma.organization.create({
          data: {
            id: orgId,
            name: opts.name,
            slug: opts.slug,
            currency: opts.currency,
            country: opts.country,
            createdAt: new Date(),
          },
        });

        if (opts.domain) {
          const existingDomain = await prisma.websites.findUnique({ where: { domain: opts.domain } });
          if (existingDomain) {
            console.error(`Domain "${opts.domain}" already exists. Organization created without website.`);
          } else {
            await prisma.websites.create({
              data: { domain: opts.domain, name: opts.name, organization_id: org.id },
            });
          }
        }

        if (opts.subscriptionType !== "none") {
          const trialEnd = opts.subscriptionType === "trial" && opts.trialDays
            ? new Date(Date.now() + parseInt(opts.trialDays, 10) * 86400000)
            : null;

          await prisma.subscriptions.create({
            data: {
              organization_id: org.id,
              provider: "paystack",
              type: opts.subscriptionType,
              status: opts.subscriptionType === "trial" ? "trialing" : "active",
              trial_end_date: trialEnd,
              currency: opts.currency,
            },
          });
        }

        if (opts.ownerEmail) {
          const owner = await prisma.user.findUnique({ where: { email: opts.ownerEmail.toLowerCase() } });
          if (owner) {
            await prisma.member.create({
              data: { id: crypto.randomUUID(), userId: owner.id, organizationId: org.id, role: "owner", createdAt: new Date() },
            });
            console.log(`Added ${owner.email} as owner.`);
          } else {
            console.error(`User ${opts.ownerEmail} not found. Organization created without owner.`);
          }
        }

        if (opts.json) {
          console.log(JSON.stringify(org, null, 2));
        } else {
          console.log(`Organization created: ${org.name} (${org.slug})`);
          console.log(`ID: ${org.id}`);
        }
      });
    });
}
