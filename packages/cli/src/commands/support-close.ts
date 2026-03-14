import { Command } from "commander";
import { withDb } from "../lib/db.js";

export function supportCloseCommand() {
  return new Command("close")
    .description("Close a support ticket")
    .argument("<ticket-id>", "Ticket ID or ticket number")
    .option("--resolved", "Mark as resolved before closing")
    .action(async (identifier: string, opts: { resolved?: boolean }) => {
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

        const now = new Date();
        const data: Record<string, unknown> = {
          status: "closed",
          closed_at: now,
          updated_at: now,
        };

        if (opts.resolved) {
          data.resolved_at = now;
        }

        await prisma.support_tickets.update({ where: { id: ticket.id }, data });
        console.log(`Ticket ${ticket.ticket_number} closed${opts.resolved ? " (resolved)" : ""}.`);
      });
    });
}
