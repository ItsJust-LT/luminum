import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printTable } from "../lib/output.js";
import { resolveOrg } from "../lib/resolve.js";

export function orgMembersCommand() {
  return new Command("members")
    .description("List organization members")
    .argument("<id|slug>", "Organization ID or slug")
    .option("--json", "Output as JSON")
    .action(async (identifier: string, opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        const members = await prisma.member.findMany({
          where: { organizationId: org.id },
          include: { user: { select: { id: true, email: true, name: true, role: true, banned: true } } },
        });

        if (opts.json) {
          output(members, true);
        } else {
          console.log(`Members of "${org.name}" (${org.slug}):\n`);
          printTable(
            members.map((m) => ({
              email: m.user.email,
              name: m.user.name || "",
              org_role: m.role,
              sys_role: m.user.role || "user",
              banned: m.user.banned ? "YES" : "",
            })),
          );
        }
      });
    });
}
