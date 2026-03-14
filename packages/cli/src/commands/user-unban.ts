import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveUser } from "../lib/resolve.js";

export function userUnbanCommand() {
  return new Command("unban")
    .description("Unban a user")
    .argument("<email>", "User email")
    .action(async (email: string) => {
      await withDb(async (prisma) => {
        const user = await resolveUser(prisma, email);
        if (!user) return;

        if (!user.banned) {
          console.log(`User ${user.email} is not banned. No change.`);
          return;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { banned: false, banReason: null, banExpires: null },
        });
        console.log(`User ${user.email} has been unbanned.`);
      });
    });
}
