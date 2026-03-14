import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue, printTable } from "../lib/output.js";
import { resolveOrg } from "../lib/resolve.js";

export function orgShowCommand() {
  return new Command("show")
    .description("Show organization details")
    .argument("<id|slug>", "Organization ID or slug")
    .option("--json", "Output as JSON")
    .action(async (identifier: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        const members = await prisma.member.findMany({
          where: { organizationId: org.id },
          include: { user: { select: { email: true, name: true } } },
        });

        const websites = await prisma.websites.findMany({
          where: { organization_id: org.id },
          select: { id: true, domain: true, name: true, analytics: true },
        });

        const subs = await prisma.subscriptions.findMany({
          where: { organization_id: org.id },
          select: { id: true, plan_name: true, status: true, type: true },
        });

        if (opts.json) {
          output({ ...org, members, websites, subscriptions: subs }, true);
          return;
        }

        printKeyValue({
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.subscription_status || "active",
          currency: org.currency,
          country: org.country,
          emails_enabled: org.emails_enabled,
          email_from: org.email_from_address,
          billing_email: org.billing_email,
          storage: `${org.used_storage_bytes ?? 0} / ${org.max_storage_bytes ?? 0} bytes`,
          created: org.createdAt.toISOString(),
        });

        if (members.length > 0) {
          console.log("\nMembers:");
          printTable(members.map((m) => ({ email: m.user.email, name: m.user.name || "", role: m.role })));
        }

        if (websites.length > 0) {
          console.log("\nWebsites:");
          printTable(websites.map((w) => ({ domain: w.domain, name: w.name || "", analytics: w.analytics ? "YES" : "" })));
        }

        if (subs.length > 0) {
          console.log("\nSubscriptions:");
          printTable(subs.map((s) => ({ id: s.id.slice(0, 12) + "…", plan: s.plan_name || "", status: s.status, type: s.type })));
        }
      });
    });
}
