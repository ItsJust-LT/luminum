import { prisma } from "./prisma.js";
import { isEmailSystemEnabled, EMAIL_SYSTEM_UNAVAILABLE_MESSAGE } from "./email-system.js";

const MAIL_APP_URL = (process.env.MAIL_APP_URL || "").replace(/\/$/, "");
const MAIL_APP_SECRET = process.env.MAIL_APP_SECRET || "";

export interface OrgReplyAddress {
  from: string;
  replyTo: string;
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

export interface SendViaMailAppPayload {
  from: string;
  replyTo: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; contentType: string; contentBase64: string }[];
  inReplyTo?: string;
  references?: string;
  messageId?: string;
}

export async function sendViaMailApp(payload: SendViaMailAppPayload): Promise<{ messageId: string }> {
  if (!isEmailSystemEnabled()) {
    throw new Error(EMAIL_SYSTEM_UNAVAILABLE_MESSAGE);
  }
  if (!MAIL_APP_URL) {
    throw new Error("MAIL_APP_URL not configured");
  }
  const url = `${MAIL_APP_URL}/send`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (MAIL_APP_SECRET) {
    headers["X-Mail-Secret"] = MAIL_APP_SECRET;
    headers["Authorization"] = `Bearer ${MAIL_APP_SECRET}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mail app returned ${res.status}: ${body || res.statusText}`);
  }
  const data = (await res.json()) as { messageId?: string };
  const messageId = data?.messageId || `<${Date.now()}.${Math.random().toString(36).slice(2)}@local>`;
  return { messageId };
}
