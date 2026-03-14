import { Command } from "commander";
import { withDb } from "../lib/db.js";

const VALID_STATUSES = ["active", "canceled", "trialing", "past_due", "paused"];

export function subscriptionSetStatusCommand() {
  return new Command("set-status")
    .description("Set subscription status (no provider sync)")
    .argument("<id>", "Subscription ID")
    .argument("<status>", `Status: ${VALID_STATUSES.join(", ")}`)
    .action(async (id: string, status: string) => {
      if (!VALID_STATUSES.includes(status)) {
        console.error(`Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`);
        process.exitCode = 1;
        return;
      }

      await withDb(async (prisma) => {
        const sub = await prisma.subscriptions.findUnique({ where: { id } });
        if (!sub) {
          console.error(`Subscription not found: ${id}`);
          process.exitCode = 1;
          return;
        }

        await prisma.subscriptions.update({
          where: { id },
          data: { status, updated_at: new Date() },
        });

        console.log(`Subscription ${id} status set to "${status}".`);
      });
    });
}
