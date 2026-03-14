import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";
import { resolveUser } from "../lib/resolve.js";

export function userSessionsCommand() {
  return new Command("sessions")
    .description("List or revoke user sessions")
    .argument("<email>", "User email")
    .option("--revoke-all", "Delete all sessions for user")
    .option("--json", "Output as JSON")
    .action(async (email: string, opts: { revokeAll?: boolean; json?: boolean }) => {
      await withDb(async (prisma) => {
        const user = await resolveUser(prisma, email);
        if (!user) return;

        if (opts.revokeAll) {
          const result = await prisma.session.deleteMany({ where: { userId: user.id } });
          console.log(`Revoked ${result.count} session(s) for ${user.email}.`);
          return;
        }

        const sessions = await prisma.session.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true, expiresAt: true, userAgent: true, ipAddress: true },
        });

        if (opts.json) {
          output(sessions, true);
        } else {
          printTable(
            sessions.map((s) => ({
              id: s.id.slice(0, 12) + "…",
              created: s.createdAt.toISOString().slice(0, 16),
              expires: s.expiresAt.toISOString().slice(0, 16),
              ip: s.ipAddress || "",
              agent: (s.userAgent || "").slice(0, 30),
            })),
          );
        }
      });
    });
}
