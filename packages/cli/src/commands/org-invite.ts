import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveOrg } from "../lib/resolve.js";
import crypto from "node:crypto";

export function orgInviteCommand() {
  return new Command("invite")
    .description("Create an invitation for an organization")
    .argument("<id|slug>", "Organization ID or slug")
    .argument("<email>", "Email to invite")
    .option("--role <role>", "Role: owner, admin, member", "member")
    .option("--expires-days <days>", "Expiry in days", "7")
    .action(async (identifier: string, email: string, opts: { role: string; expiresDays: string }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        const existing = await prisma.invitation.findFirst({
          where: { organizationId: org.id, email: email.toLowerCase(), status: "pending" },
        });
        if (existing) {
          console.error(`Pending invitation already exists for ${email} in ${org.name}.`);
          process.exitCode = 1;
          return;
        }

        const invitationId = crypto.randomUUID();
        await prisma.invitation.create({
          data: {
            id: invitationId,
            email: email.toLowerCase(),
            role: opts.role,
            organizationId: org.id,
            status: "pending",
            expiresAt: new Date(Date.now() + parseInt(opts.expiresDays, 10) * 86400000),
            createdAt: new Date(),
          },
        });

        console.log(`Invitation created for ${email} to join "${org.name}" as ${opts.role}.`);
        console.log(`Invitation ID: ${invitationId}`);
      });
    });
}
