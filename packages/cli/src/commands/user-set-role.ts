import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveUser } from "../lib/resolve.js";

export function userSetRoleCommand() {
  return new Command("set-role")
    .description("Set user role")
    .argument("<email>", "User email")
    .argument("<role>", "Role: admin or user")
    .action(async (email: string, role: string) => {
      if (!["admin", "user"].includes(role)) {
        console.error(`Invalid role "${role}". Must be "admin" or "user".`);
        process.exitCode = 1;
        return;
      }

      await withDb(async (prisma) => {
        const user = await resolveUser(prisma, email);
        if (!user) return;

        if (user.role === role) {
          console.log(`User ${user.email} already has role "${role}". No change.`);
          return;
        }

        await prisma.user.update({ where: { id: user.id }, data: { role } });
        console.log(`User ${user.email} role set to "${role}".`);
      });
    });
}
