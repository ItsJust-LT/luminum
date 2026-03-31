import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || "http://localhost:3000";

interface AppInvitationData {
  name: string;
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  inviteLink: string;
}

interface OrganizationInvitationData {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  teamName: string;
  inviteLink: string;
}

interface EmailVerificationData {
  name: string;
  email: string;
  verificationLink: string;
}

interface PasswordResetData {
  name: string;
  email: string;
  resetLink: string;
}

interface MemberRemovalData {
  memberName: string;
  memberEmail: string;
  organizationName: string;
  removedBy: string;
}

export async function sendAppInvitation(data: AppInvitationData) {
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [data.email],
    subject: "You've been invited to join Luminum Agency",
    html: `<p>Hi ${data.name},</p><p>${data.invitedByUsername} (${data.invitedByEmail}) has invited you to join Luminum Agency.</p><p><a href="${data.inviteLink}">Accept Invitation</a></p>`,
  });
  if (error) throw new Error("Failed to send invitation email");
  return result;
}

export async function sendOrganizationInvitation(data: OrganizationInvitationData) {
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [data.email],
    subject: `You've been invited to join ${data.teamName}`,
    html: `<p>Hi,</p><p>${data.invitedByUsername} (${data.invitedByEmail}) has invited you to join ${data.teamName}.</p><p><a href="${data.inviteLink}">Accept Invitation</a></p>`,
  });
  if (error) throw new Error("Failed to send organization invitation email");
  return result;
}

export async function sendEmailVerification(data: EmailVerificationData) {
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [data.email],
    subject: "Verify your email address",
    html: `<p>Hi ${data.name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${data.verificationLink}">Verify Email</a></p>`,
  });
  if (error) throw new Error("Failed to send verification email");
  return result;
}

export async function sendPasswordReset(data: PasswordResetData) {
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [data.email],
    subject: "Reset your password",
    html: `<p>Hi ${data.name},</p><p>Click the link below to reset your password:</p><p><a href="${data.resetLink}">Reset Password</a></p>`,
  });
  if (error) throw new Error("Failed to send password reset email");
  return result;
}

export async function sendOrganizationInvitationEmail({
  email,
  role,
  organizationName,
  inviteLink,
  invitedByUsername,
  invitedByEmail,
  userExists,
}: {
  email: string;
  role: "admin" | "member" | "owner";
  organizationName: string;
  inviteLink: string;
  invitedByUsername: string;
  invitedByEmail: string;
  userExists: boolean;
}) {
  const subject = userExists
    ? `You're invited to join ${organizationName}`
    : `Join ${organizationName} on Luminum Agency`;
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [email],
    subject,
    html: `<p>Hi,</p><p>${invitedByUsername} (${invitedByEmail}) has invited you to join ${organizationName} as ${role}.</p><p><a href="${inviteLink}">Accept Invitation</a></p>`,
  });
  if (error) throw new Error("Failed to send organization invitation email");
  return result;
}

export async function sendOwnerInvitationEmail({
  email,
  name,
  organizationName,
  invitationLink,
  invitedBy,
}: {
  email: string;
  name: string;
  organizationName: string;
  invitationLink: string;
  invitedBy: string;
}) {
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [email],
    subject: `You've been invited to own ${organizationName}`,
    html: `<p>Hi ${name},</p><p>${invitedBy} has invited you to become the owner of ${organizationName}.</p><p><a href="${invitationLink}">Accept Ownership</a></p>`,
  });
  if (error) throw new Error("Failed to send owner invitation email");
  return result;
}

/** Email for transferring ownership of an existing organization (recipient accepts to become owner). */
export async function sendOwnershipTransferInvitationEmail({
  email,
  organizationName,
  invitationLink,
  invitedBy,
}: {
  email: string;
  organizationName: string;
  invitationLink: string;
  invitedBy: string;
}) {
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [email],
    subject: `Ownership of ${organizationName} is being transferred to you`,
    html: `<p>Hi,</p><p>${invitedBy} has started a transfer of <strong>${organizationName}</strong> to you. When you accept, you will become the organization owner and the current owner will become an admin.</p><p><a href="${invitationLink}">Review and accept ownership</a></p><p>If you did not expect this, you can ignore this email.</p>`,
  });
  if (error) throw new Error("Failed to send ownership transfer email");
  return result;
}

export async function sendMemberRemovalEmail(data: MemberRemovalData) {
  const dashboardLink = `${APP_URL}/dashboard`;
  const { data: result, error } = await resend.emails.send({
    from: "Luminum Agency <noreply@luminum.agency>",
    to: [data.memberEmail],
    subject: `You have been removed from ${data.organizationName}`,
    html: `<p>Hi ${data.memberName},</p><p>${data.removedBy} has removed you from ${data.organizationName}.</p><p><a href="${dashboardLink}">Go to Dashboard</a></p>`,
  });
  if (error) throw new Error("Failed to send member removal email");
  return result;
}

export async function sendInvitationEmail({
  email,
  name,
  organizationName,
  invitationLink,
  invitedBy,
}: {
  email: string;
  name: string;
  organizationName: string;
  invitationLink: string;
  invitedBy: string;
}) {
  const { data: result, error } = await resend.emails.send({
    from: "noreply@luminum.agency",
    to: [email],
    subject: `You're invited to join ${organizationName}`,
    html: `<p>Hi ${name},</p><p>${invitedBy} has invited you to join ${organizationName}.</p><p><a href="${invitationLink}">Accept Invitation</a></p>`,
  });
  if (error) throw new Error("Failed to send invitation email");
  return { success: true, id: result?.id };
}
