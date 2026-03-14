import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue } from "../lib/output.js";

export function statsCommand() {
  return new Command("stats")
    .description("Show system-wide statistics")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const [users, orgs, websites, subscriptions, emails, formSubmissions, supportTickets] =
          await Promise.all([
            prisma.user.count(),
            prisma.organization.count(),
            prisma.websites.count(),
            prisma.subscriptions.count({ where: { status: "active" } }),
            prisma.email.count(),
            prisma.form_submissions.count(),
            prisma.support_tickets.count({ where: { status: "open" } }),
          ]);

        const data = {
          users,
          organizations: orgs,
          websites,
          active_subscriptions: subscriptions,
          emails,
          form_submissions: formSubmissions,
          open_tickets: supportTickets,
        };

        if (opts.json) {
          output(data, true);
        } else {
          console.log("System Statistics\n");
          printKeyValue(data);
        }
      });
    });
}
