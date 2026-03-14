import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue } from "../lib/output.js";
import { resolveUser } from "../lib/resolve.js";

export function userShowCommand() {
  return new Command("show")
    .description("Show user details")
    .argument("<email|id>", "User email or ID")
    .option("--json", "Output as JSON")
    .action(async (identifier: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const user = await resolveUser(prisma, identifier);
        if (!user) return;

        const memberships = await prisma.member.findMany({
          where: { userId: user.id },
          include: { organization: { select: { id: true, name: true, slug: true } } },
        });

        const sessionCount = await prisma.session.count({ where: { userId: user.id } });

        const data = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || "user",
          banned: user.banned ? "YES" : "no",
          banReason: user.banReason,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
          sessions: sessionCount,
          memberships: memberships.map((m) => `${m.organization.name} (${m.role})`).join(", ") || "(none)",
        };

        if (opts.json) {
          output({ ...user, memberships, sessionCount }, true);
        } else {
          printKeyValue(data);
        }
      });
    });
}
