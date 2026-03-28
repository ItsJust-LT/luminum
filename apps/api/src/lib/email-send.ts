import { prisma } from "./prisma.js";
import { isEmailSystemEnabled, EMAIL_SYSTEM_UNAVAILABLE_MESSAGE } from "./email-system.js";
import type { SendViaMailAppPayload } from "./email-outbound-types.js";
import { assertOrgCanSendViaSes, isSesSendEnvironmentReady, sendViaSes } from "./email-ses.js";

export type { SendViaMailAppPayload } from "./email-outbound-types.js";

export interface OrgReplyAddress {
  from: string;
  replyTo: string;
}

export interface OutboundSendResult {
  provider: "ses";
  /** RFC Message-ID stored on the email row (same as request when provided). */
  messageId: string;
  /** Kept for DB compatibility; always false with SES-only outbound. */
  fallbackUsed: false;
  /** Amazon SES MessageId */
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

/**
 * Outbound From is always an address on the org’s verified email domain (e.g. noreply@customer.com).
 * Optional `fromLocalPart` sets the mailbox name (default `noreply` when omitted or empty).
 */
export async function getOrgReplyAddress(organizationId: string, fromLocalPart?: string | null): Promise<OrgReplyAddress> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      emails_enabled: true,
      email_domain_id: true,
      email_from_address: true,
      email_domain: { select: { domain: true } },
    },
  });
  if (!org || !org.emails_enabled || !org.email_domain_id || !org.email_domain) {
    throw new Error("Email not enabled or no email domain configured for this organization");
  }
  const domain = org.email_domain.domain.toLowerCase().replace(/\.$/, "");
  const replyTo = org.email_from_address || `replies@${domain}`;
  let local = normalizeEmailLocalPart(fromLocalPart ?? "");
  if (!local) {
    local = "noreply";
  }
  if (!isValidEmailLocalPart(local)) {
    throw new Error("Invalid From address: use letters, numbers, and . _ - only (1–64 characters before @)");
  }
  const from = `${local}@${domain}`;
  return { from, replyTo };
}

/**
 * Send outbound mail via Amazon SES only (org domain must be verified; optional strict DKIM).
 */
export async function sendOutboundViaSes(organizationId: string, payload: SendViaMailAppPayload): Promise<OutboundSendResult> {
  if (!isEmailSystemEnabled()) {
    throw new Error(EMAIL_SYSTEM_UNAVAILABLE_MESSAGE);
  }
  if (!isSesSendEnvironmentReady()) {
    throw new Error("SES is not configured (set AWS_REGION or AWS_DEFAULT_REGION and AWS credentials or instance role)");
  }
  const allowList = (process.env.EMAIL_SEND_SES_ORG_IDS || "").trim();
  if (allowList) {
    const ids = allowList
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.includes(organizationId)) {
      throw new Error("Outbound email is restricted for this organization (EMAIL_SEND_SES_ORG_IDS)");
    }
  }
  await assertOrgCanSendViaSes(organizationId);

  const requestedMid = payload.messageId?.trim() || `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
  const payloadWithMid = { ...payload, messageId: requestedMid };
  const { providerMessageId } = await sendViaSes(payloadWithMid);
  return {
    provider: "ses",
    messageId: requestedMid,
    fallbackUsed: false,
    providerMessageId,
  };
}
