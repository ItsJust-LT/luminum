import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveUser } from "../lib/resolve.js";

export function supportAssignCommand() {
  return new Command("assign")
    .description("Assign a support ticket to a user")
    .argument("<ticket-id>", "Ticket ID or ticket number")
    .argument("<user-email>", "Assignee email")
    .action(async (identifier: string, email: string) => {
      await withDb(async (prisma) => {
        let ticket = await prisma.support_tickets.findUnique({ where: { ticket_number: identifier } });
        if (!ticket) {
          ticket = await prisma.support_tickets.findUnique({ where: { id: identifier } });
        }
        if (!ticket) {
          console.error(`Ticket not found: ${identifier}`);
          process.exitCode = 1;
          return;
        }

        const user = await resolveUser(prisma, email);
        if (!user) return;

        await prisma.support_tickets.update({
          where: { id: ticket.id },
          data: { assigned_to: user.id, assigned_at: new Date(), updated_at: new Date() },
        });

        console.log(`Ticket ${ticket.ticket_number} assigned to ${user.email}.`);
      });
    });
}
