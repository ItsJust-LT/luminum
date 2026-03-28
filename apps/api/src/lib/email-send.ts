import { prisma } from "./prisma.js";
import { isEmailSystemEnabled, EMAIL_SYSTEM_UNAVAILABLE_MESSAGE } from "./email-system.js";
import type { SendViaMailAppPayload } from "./email-outbound-types.js";
import { isSesSendEnvironmentReady, sendViaSes } from "./email-ses.js";

export type { SendViaMailAppPayload } from "./email-outbound-types.js";

const MAIL_APP_URL = (process.env.MAIL_APP_URL || "").replace(/\/$/, "");
const MAIL_APP_SECRET = process.env.MAIL_APP_SECRET || "";

export interface OrgReplyAddress {
  from: string;
  replyTo: string;
}

export class MailAppHttpError extends Error {
  readonly status: number;
  readonly bodyText: string;
  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.name = "MailAppHttpError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

export interface OutboundSendResult {
  provider: "mail_app" | "ses";
  /** RFC Message-ID stored on the email row (same as request when provided). */
  messageId: string;
  fallbackUsed: boolean;
  primaryError?: string;
  /** Amazon SES MessageId when provider is ses */
  providerMessageId?: string;
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
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Mail app unreachable: ${msg}`);
  }
  const bodyText = await res.text();
  if (!res.ok) {
    throw new MailAppHttpError(`Mail app returned ${res.status}: ${bodyText || res.statusText}`, res.status, bodyText);
  }
  let data: { messageId?: string };
  try {
    data = JSON.parse(bodyText) as { messageId?: string };
  } catch {
    throw new MailAppHttpError(`Mail app returned invalid JSON (${res.status})`, 502, bodyText);
  }
  const messageId = data?.messageId?.trim() || payload.messageId?.trim() || `<${Date.now()}.${Math.random().toString(36).slice(2)}@local>`;
  return { messageId };
}

/**
 * After primary mail-app failure, attempt SES only for likely recipient/infrastructure issues — not client mistakes.
 */
export function shouldAttemptSesAfterMailFailure(err: unknown): boolean {
  if (err instanceof MailAppHttpError) {
    if (err.status === 400 || err.status === 401 || err.status === 403) return false;
    const combined = `${err.message}\n${err.bodyText}`.toLowerCase();
    if (/\binvalid from\b/.test(combined)) return false;
    if (/\binvalid recipient\b/.test(combined)) return false;
    if (/invalid json/.test(combined)) return false; // primary misconfiguration / bug — do not SES
    if (/missing ['"]to['"]/.test(combined)) return false;
    if (/missing ['"]from['"]/.test(combined)) return false;
    if (/no mail_from_default/i.test(combined)) return false;
    return true;
  }
  if (err instanceof Error && err.message === EMAIL_SYSTEM_UNAVAILABLE_MESSAGE) return false;
  if (err instanceof Error && /mail_app_url not configured/i.test(err.message)) return false;
  // Network errors, timeouts, etc. — eligible for SES if configured
  return true;
}

export async function sendOutboundWithFallback(organizationId: string, payload: SendViaMailAppPayload): Promise<OutboundSendResult> {
  const requestedMid = payload.messageId?.trim() || `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
  const payloadWithMid = { ...payload, messageId: requestedMid };

  let primaryError: string | undefined;
  try {
    const { messageId } = await sendViaMailApp(payloadWithMid);
    return {
      provider: "mail_app",
      messageId: messageId || requestedMid,
      fallbackUsed: false,
      providerMessageId: undefined,
    };
  } catch (e) {
    primaryError = e instanceof Error ? e.message : String(e);

    const sesEnabled = process.env.EMAIL_SEND_FALLBACK_SES_ENABLED === "true";
    if (!sesEnabled || !shouldAttemptSesAfterMailFailure(e)) {
      throw e instanceof Error ? e : new Error(primaryError);
    }

    if (!isSesSendEnvironmentReady()) {
      throw e instanceof Error ? e : new Error(primaryError);
    }

    const orgSes = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { email_ses_verified_at: true },
    });
    if (!orgSes?.email_ses_verified_at) {
      throw new Error(
        `${primaryError} · SES fallback unavailable: verify the domain in Amazon SES and use Verify DNS (or SES sync) so the dashboard marks SES as ready.`,
      );
    }

    const allowList = (process.env.EMAIL_SEND_SES_ORG_IDS || "").trim();
    if (allowList) {
      const ids = allowList.split(",").map((s) => s.trim()).filter(Boolean);
      if (!ids.includes(organizationId)) {
        throw new Error(`${primaryError} · SES fallback is restricted (EMAIL_SEND_SES_ORG_IDS).`);
      }
    }

    try {
      const { providerMessageId } = await sendViaSes(payloadWithMid);
      return {
        provider: "ses",
        messageId: requestedMid,
        fallbackUsed: true,
        primaryError,
        providerMessageId,
      };
    } catch (sesErr) {
      const sesMsg = sesErr instanceof Error ? sesErr.message : String(sesErr);
      throw new Error(`${primaryError} · SES fallback failed: ${sesMsg}`);
    }
  }
}
