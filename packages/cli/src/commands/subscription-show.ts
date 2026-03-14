import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue } from "../lib/output.js";

export function subscriptionShowCommand() {
  return new Command("show")
    .description("Show subscription details")
    .argument("<id>", "Subscription ID")
    .option("--json", "Output as JSON")
    .action(async (id: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const sub = await prisma.subscriptions.findUnique({
          where: { id },
          include: {
            organization_subscriptions_organization_idToorganization: { select: { name: true, slug: true } },
            payments: { orderBy: { created_at: "desc" }, take: 5 },
          },
        });

        if (!sub) {
          console.error(`Subscription not found: ${id}`);
          process.exitCode = 1;
          return;
        }

        if (opts.json) {
          output(sub, true);
        } else {
          const org = sub.organization_subscriptions_organization_idToorganization;
          printKeyValue({
            id: sub.id,
            organization: `${org.name} (${org.slug})`,
            plan: sub.plan_name || "(none)",
            type: sub.type,
            status: sub.status,
            provider: sub.provider,
            amount: sub.amount ? `${sub.amount} ${sub.currency}` : "(none)",
            billing_cycle: sub.billing_cycle || "(none)",
            current_period: sub.current_period_start && sub.current_period_end
              ? `${sub.current_period_start.toISOString().slice(0, 10)} → ${sub.current_period_end.toISOString().slice(0, 10)}`
              : "(none)",
            canceled_at: sub.canceled_at?.toISOString() || "(none)",
            recent_payments: sub.payments.length,
          });
        }
      });
    });
}
