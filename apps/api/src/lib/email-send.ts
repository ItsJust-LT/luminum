import { prisma } from "./prisma.js";

const MAIL_APP_URL = (process.env.MAIL_APP_URL || "").replace(/\/$/, "");
const MAIL_APP_SECRET = process.env.MAIL_APP_SECRET || "";
const MAIL_FROM_DEFAULT = process.env.MAIL_FROM_DEFAULT || "Luminum <noreply@luminum.agency>";

export interface OrgReplyAddress {
  from: string;
  replyTo: string;
}

export async function getOrgReplyAddress(organizationId: string): Promise<OrgReplyAddress> {
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
  const domain = org.email_domain.domain;
  const replyTo = org.email_from_address || `replies@${domain}`;
  const from = MAIL_FROM_DEFAULT;
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
