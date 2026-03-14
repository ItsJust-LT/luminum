import { Command } from "commander";
import { withDb } from "../lib/db.js";

export function createAdminCommand() {
  return new Command("admin")
    .description("Set a user as admin by email, or remove admin role")
    .argument("<email>", "User email address")
    .option("--remove", "Remove admin role (set to user)")
    .action(async (email: string, options: { remove?: boolean }) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        console.error("Invalid email address.");
        process.exitCode = 1;
        return;
      }

      await withDb(async (prisma) => {
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true, name: true, role: true },
        });

        if (!user) {
          console.error(`No user found with email: ${email}`);
          process.exitCode = 1;
          return;
        }

        if (options.remove) {
          if (user.role !== "admin") {
            console.log(`User ${user.email} is not an admin. No change.`);
            return;
          }
          await prisma.user.update({ where: { id: user.id }, data: { role: "user" } });
          console.log(`Admin role removed for ${user.email}. Role set to "user".`);
        } else {
          if (user.role === "admin") {
            console.log(`User ${user.email} is already an admin. No change.`);
            return;
          }
          await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } });
          console.log(`User ${user.email} (${user.name || user.id}) is now an admin.`);
        }
      });
    });
}
