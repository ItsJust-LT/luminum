import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { sendOwnershipTransferInvitationEmail } from "./email.js";

export type CreateOwnershipTransferInviteResult =
  | { ok: true; invitationId: string }
  | { ok: false; error: string; status: number };

/**
 * Creates a pending owner invitation with ownership_transfer=true and emails the recipient.
 * Caller must enforce auth (org owner or platform admin).
 */
export async function createOwnershipTransferInvitation(params: {
  organizationId: string;
  emailRaw: string;
  inviterId: string;
  inviterName: string;
}): Promise<CreateOwnershipTransferInviteResult> {
  const email = params.emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Valid email is required", status: 400 };
  }

  const org = await prisma.organization.findUnique({
    where: { id: params.organizationId },
    select: { id: true, name: true },
  });
  if (!org) return { ok: false, error: "Organization not found", status: 404 };

  const owners = await prisma.member.findMany({
    where: { organizationId: params.organizationId, role: "owner" },
    include: { user: { select: { email: true } } },
  });
  if (owners.length === 0) {
    return { ok: false, error: "This organization has no owner to transfer from", status: 400 };
  }

  if (owners.some((o) => (o.user.email || "").toLowerCase() === email)) {
    return { ok: false, error: "That email already belongs to an owner of this organization", status: 400 };
  }

  const pendingSame = await prisma.invitation.findFirst({
    where: { organizationId: params.organizationId, email, status: "pending" },
  });
  if (pendingSame) {
    return { ok: false, error: "A pending invitation already exists for this email", status: 400 };
  }

  await prisma.invitation.updateMany({
    where: {
      organizationId: params.organizationId,
      status: "pending",
      ownership_transfer: true,
    },
    data: { status: "cancelled" },
  });

  const invitationId = crypto.randomUUID();
  await prisma.invitation.create({
    data: {
      id: invitationId,
      email,
      role: "owner",
      organizationId: params.organizationId,
      inviterId: params.inviterId,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      ownership_transfer: true,
    },
  });

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const invitationLink = `${APP_URL}/accept-owner-invitation/${invitationId}`;
  try {
    await sendOwnershipTransferInvitationEmail({
      email,
      organizationName: org.name,
      invitationLink,
      invitedBy: params.inviterName || "An administrator",
    });
  } catch (e) {
    console.error("sendOwnershipTransferInvitationEmail:", e);
  }

  return { ok: true, invitationId };
}
