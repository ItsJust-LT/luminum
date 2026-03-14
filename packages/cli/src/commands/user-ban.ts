import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveUser } from "../lib/resolve.js";

export function userBanCommand() {
  return new Command("ban")
    .description("Ban a user")
    .argument("<email>", "User email")
    .option("--reason <reason>", "Ban reason")
    .option("--expires <date>", "Ban expiry (ISO date)")
    .action(async (email: string, opts: { reason?: string; expires?: string }) => {
      await withDb(async (prisma) => {
        const user = await resolveUser(prisma, email);
        if (!user) return;

        if (user.banned) {
          console.log(`User ${user.email} is already banned.`);
          return;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            banned: true,
            banReason: opts.reason || "Banned via CLI",
            banExpires: opts.expires ? new Date(opts.expires) : null,
          },
        });
        console.log(`User ${user.email} has been banned.`);
      });
    });
}
