import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue, printTable } from "../lib/output.js";

export function supportShowCommand() {
  return new Command("show")
    .description("Show support ticket details")
    .argument("<ticket-id|number>", "Ticket ID or ticket number")
    .option("--json", "Output as JSON")
    .action(async (identifier: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        let ticket = await prisma.support_tickets.findUnique({
          where: { ticket_number: identifier },
          include: {
            support_messages: {
              orderBy: { created_at: "asc" },
              include: { user_support_messages_sender_idTouser: { select: { email: true, name: true } } },
            },
            support_ticket_participants: {
              include: { user: { select: { email: true, name: true } } },
            },
          },
        });

        if (!ticket) {
          ticket = await prisma.support_tickets.findUnique({
            where: { id: identifier },
            include: {
              support_messages: {
                orderBy: { created_at: "asc" },
                include: { user_support_messages_sender_idTouser: { select: { email: true, name: true } } },
              },
              support_ticket_participants: {
                include: { user: { select: { email: true, name: true } } },
              },
            },
          });
        }

        if (!ticket) {
          console.error(`Ticket not found: ${identifier}`);
          process.exitCode = 1;
          return;
        }

        if (opts.json) {
          output(ticket, true);
          return;
        }

        printKeyValue({
          number: ticket.ticket_number,
          title: ticket.title,
          status: ticket.status || "open",
          priority: ticket.priority || "medium",
          category: ticket.category || "general",
          created: ticket.created_at?.toISOString() || "",
          resolved: ticket.resolved_at?.toISOString() || "(not resolved)",
          closed: ticket.closed_at?.toISOString() || "(not closed)",
          messages: ticket.support_messages.length,
        });

        if (ticket.support_ticket_participants.length > 0) {
          console.log("\nParticipants:");
          printTable(
            ticket.support_ticket_participants.map((p) => ({
              email: p.user.email,
              name: p.user.name || "",
              role: p.role,
            })),
          );
        }

        if (ticket.support_messages.length > 0) {
          console.log("\nMessages:");
          for (const m of ticket.support_messages) {
            const sender = m.user_support_messages_sender_idTouser;
            const time = m.created_at?.toISOString().slice(0, 16) || "";
            console.log(`  [${time}] ${sender.name || sender.email}: ${m.message.slice(0, 80)}`);
          }
        }
      });
    });
}
