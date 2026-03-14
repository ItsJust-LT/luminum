import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue } from "../lib/output.js";

export function emailShowCommand() {
  return new Command("show")
    .description("Show email details")
    .argument("<id>", "Email ID")
    .option("--json", "Output as JSON")
    .action(async (id: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const email = await prisma.email.findUnique({
          where: { id },
          include: { attachments: { select: { id: true, filename: true, contentType: true, size: true } } },
        });

        if (!email) {
          console.error(`Email not found: ${id}`);
          process.exitCode = 1;
          return;
        }

        if (opts.json) {
          output(email, true);
        } else {
          printKeyValue({
            id: email.id,
            direction: email.direction,
            from: email.from || "(none)",
            to: email.to || "(none)",
            subject: email.subject || "(no subject)",
            read: email.read ? "yes" : "no",
            received: email.receivedAt?.toISOString() || "",
            sent: email.sent_at?.toISOString() || "(none)",
            attachments: email.attachments.length,
            text_preview: email.text ? email.text.slice(0, 200) + (email.text.length > 200 ? "…" : "") : "(empty)",
          });

          if (email.attachments.length > 0) {
            console.log("\nAttachments:");
            for (const a of email.attachments) {
              console.log(`  ${a.filename} (${a.contentType}, ${a.size ?? 0} bytes)`);
            }
          }
        }
      });
    });
}
