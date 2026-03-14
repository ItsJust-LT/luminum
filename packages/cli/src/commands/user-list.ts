import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";

export function userListCommand() {
  return new Command("list")
    .description("List users")
    .option("--limit <n>", "Max results", "50")
    .option("--role <role>", "Filter by role (admin, user)")
    .option("--banned", "Show only banned users")
    .option("--json", "Output as JSON")
    .action(async (opts: { limit: string; role?: string; banned?: boolean; json?: boolean }) => {
      await withDb(async (prisma) => {
        const where: Record<string, unknown> = {};
        if (opts.role) where.role = opts.role;
        if (opts.banned) where.banned = true;

        const users = await prisma.user.findMany({
          where,
          take: parseInt(opts.limit, 10),
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, name: true, role: true, banned: true, createdAt: true },
        });

        if (opts.json) {
          output(users, true);
        } else {
          printTable(
            users.map((u) => ({
              email: u.email,
              name: u.name || "",
              role: u.role || "user",
              banned: u.banned ? "YES" : "",
              created: u.createdAt.toISOString().slice(0, 10),
            })),
          );
        }
      });
    });
}
