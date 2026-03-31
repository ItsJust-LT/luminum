import { prisma } from "./prisma.js";
import { isEmailSystemEnabled, EMAIL_SYSTEM_UNAVAILABLE_MESSAGE } from "./email-system.js";
import type { SendViaMailAppPayload } from "./email-outbound-types.js";
import { sendOutboundViaResendApi } from "./resend-org.js";

export type { SendViaMailAppPayload } from "./email-outbound-types.js";

export interface OrgReplyAddress {
  from: string;
  replyTo: string;
}

export interface OutboundSendResult {
  provider: "resend";
  /** RFC Message-ID stored on the email row (same as request when provided). */
  messageId: string;
  fallbackUsed: false;
  providerMessageId: string;
}

/** RFC 5321-ish local part: 1–64 chars, alphanumeric with ._- in the middle; no leading/trailing dot. */
export function isValidEmailLocalPart(local: string): boolean {
  const s = local.trim();
  if (s.length < 1 || s.length > 64) return false;
  if (s.length === 1) return /^[a-zA-Z0-9]$/.test(s);
  return /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(s);
}

export function normalizeEmailLocalPart(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Local part from a From header that may be `"Name" <user@domain.com>`. */
export function extractMailboxLocalPart(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/);
  const email = (m ? m[1] : fromHeader).trim().toLowerCase();
  const at = email.indexOf("@");
  if (at <= 0) return "noreply";
  const local = email.slice(0, at);
  return local || "noreply";
}

/** RFC 5322 display-name + addr-spec for Resend / SMTP From header. */
export function formatFromWithDisplayName(displayName: string | null | undefined, mailboxEmail: string): string {
  const email = mailboxEmail.trim();
  const raw = (displayName ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return email;
  const escaped = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}" <${email}>`;
}

export interface GetOrgReplyOptions {
  /** Shown as From display name in mail clients (e.g. member name), not the local part. */
  displayName?: string | null;
}

/**
 * Outbound mailbox is always local@orgdomain.
 * Reply-To is the same mailbox (not a separate replies@ address) so conversations stay coherent.
 * When `displayName` is set, From is `"Name" <local@domain>` so clients show the person, not "noreply".
 */
export async function getOrgReplyAddress(
  organizationId: string,
  fromLocalPart?: string | null,
  options?: GetOrgReplyOptions
): Promise<OrgReplyAddress> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      emails_enabled: true,
      email_domain_id: true,
      name: true,
      email_default_from_local: true,
      email_domain: { select: { domain: true } },
    },
  });
  if (!org || !org.emails_enabled || !org.email_domain_id || !org.email_domain) {
    throw new Error("Email not enabled or no email domain configured for this organization");
  }
  const domain = org.email_domain.domain.toLowerCase().replace(/\.$/, "");
  let local = normalizeEmailLocalPart(fromLocalPart ?? "");
  if (!local) {
    const def = org.email_default_from_local?.trim();
    if (def && isValidEmailLocalPart(def)) {
      local = normalizeEmailLocalPart(def);
    } else {
      local = "noreply";
    }
  }
  if (!isValidEmailLocalPart(local)) {
    throw new Error("Invalid From address: use letters, numbers, and . _ - only (1–64 characters before @)");
  }
  const mailboxEmail = `${local}@${domain}`;
  const display =
    (options?.displayName != null && String(options.displayName).trim()) ||
    (org.name?.trim() ? org.name.trim() : null);
  const from = formatFromWithDisplayName(display, mailboxEmail);
  const replyTo = mailboxEmail;
  return { from, replyTo };
}

/**
 * Send outbound mail via the organization’s Resend API key.
 */
export async function sendOutboundViaResend(organizationId: string, payload: SendViaMailAppPayload): Promise<OutboundSendResult> {
  if (!isEmailSystemEnabled()) {
    throw new Error(EMAIL_SYSTEM_UNAVAILABLE_MESSAGE);
  }
  const requestedMid = payload.messageId?.trim() || `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
  const { messageId, providerMessageId } = await sendOutboundViaResendApi(organizationId, {
    from: payload.from,
    replyTo: payload.replyTo,
    to: payload.to,
    subject: payload.subject,
    text: payload.text || "",
    html: payload.html,
    attachments: payload.attachments,
    inReplyTo: payload.inReplyTo,
    references: payload.references,
    messageId: requestedMid,
  });
  return {
    provider: "resend",
    messageId,
    fallbackUsed: false,
    providerMessageId,
  };
}
