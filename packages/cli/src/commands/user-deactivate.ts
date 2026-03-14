import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveUser } from "../lib/resolve.js";

export function userDeactivateCommand() {
  return new Command("deactivate")
    .description("Deactivate a user (ban with standard reason)")
    .argument("<email>", "User email")
    .action(async (email: string) => {
      await withDb(async (prisma) => {
        const user = await resolveUser(prisma, email);
        if (!user) return;

        await prisma.user.update({
          where: { id: user.id },
          data: { banned: true, banReason: "Deactivated by admin" },
        });
        console.log(`User ${user.email} has been deactivated.`);
      });
    });
}
