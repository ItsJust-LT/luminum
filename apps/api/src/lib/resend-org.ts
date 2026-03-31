import { Resend } from "resend";
import { prisma } from "./prisma.js";
import { decryptEmailSecret } from "./email-secrets.js";
import { normalizeMessageIdForStorage, normalizeReferencesForStorage } from "./email-message-id.js";

export const OUTBOUND_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export function maskResendApiKey(key: string): string {
  const t = key.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export async function getOrgWithResendFields(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      resend_api_key_ciphertext: true,
      resend_webhook_secret_ciphertext: true,
      resend_last_validated_at: true,
      resend_last_error: true,
      email_dns_verified_at: true,
      email_domain_id: true,
      email_domain: { select: { domain: true } },
    },
  });
}

export function createResendClient(apiKey: string): Resend {
  return new Resend(apiKey.trim());
}

/** Serializable slice of Resend domain for dashboards / setup-status. */
export type ResendDomainHealth = {
  name: string;
  status: string;
  region?: string;
  sending: string;
  receiving: string;
  /** DNS records Resend expects (when API returns them). */
  records?: { record: string; name: string; type: string; ttl?: string; status?: string; value?: string }[];
};

/**
 * Returns whether the org's mail domain exists in Resend with verified sending and enabled receiving.
 * `health` is set whenever a matching domain row exists (even when not fully OK).
 */
export async function validateOrgResendDomain(apiKey: string, mailDomain: string): Promise<{
  ok: boolean;
  error?: string;
  health?: ResendDomainHealth;
}> {
  const resend = createResendClient(apiKey);
  const want = mailDomain.toLowerCase().replace(/\.$/, "").trim();
  const { data, error } = await resend.domains.list();
  if (error) {
    return { ok: false, error: error.message || "Resend domains.list failed" };
  }
  const rows = data?.data ?? [];
  const match = rows.find((d) => d.name.toLowerCase() === want);
  if (!match) {
    return {
      ok: false,
      error: `Domain "${want}" is not listed in this Resend project. Add it under Resend → Domains, then publish the DNS records Resend shows.`,
    };
  }
  const rawRecords = (match as { records?: ResendDomainHealth["records"] }).records;
  const health: ResendDomainHealth = {
    name: match.name,
    status: String(match.status ?? "unknown"),
    region: (match as { region?: string }).region,
    sending: String(match.capabilities?.sending ?? "unknown"),
    receiving: String(match.capabilities?.receiving ?? "unknown"),
    records: Array.isArray(rawRecords) ? rawRecords : undefined,
  };

  if (match.status !== "verified") {
    return {
      ok: false,
      health,
      error: `Domain is not verified in Resend yet (status: ${match.status}). Open Resend → Domains → ${want} and complete DNS verification.`,
    };
  }
  if (match.capabilities.sending !== "enabled") {
    return {
      ok: false,
      health,
      error: `Sending is not enabled for this domain in Resend (capability: ${match.capabilities.sending}). Enable sending in the Resend dashboard.`,
    };
  }
  if (match.capabilities.receiving !== "enabled") {
    return {
      ok: false,
      health,
      error: `Receiving is not enabled for this domain in Resend. Turn on inbound email and add the MX (and related) records Resend provides.`,
    };
  }
  return { ok: true, health };
}

export async function assertOrgCanSendWithResend(organizationId: string): Promise<string> {
  const org = await getOrgWithResendFields(organizationId);
  if (!org?.email_domain?.domain) {
    throw new Error("No email domain configured for this organization");
  }
  if (!org.resend_api_key_ciphertext) {
    throw new Error(
      "Mail is not fully configured for this organization. A platform administrator must complete setup in Admin → Organization settings."
    );
  }
  if (!org.email_dns_verified_at) {
    throw new Error("Email setup is not complete. Save your Resend credentials and run Verify setup.");
  }
  try {
    return decryptEmailSecret(org.resend_api_key_ciphertext);
  } catch {
    throw new Error("Could not decrypt stored Resend API key (check LUMINUM_EMAIL_SECRETS_KEY).");
  }
}

export async function sendOutboundViaResendApi(
  organizationId: string,
  payload: {
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
): Promise<{ messageId: string; providerMessageId: string }> {
  const apiKey = await assertOrgCanSendWithResend(organizationId);
  const resend = createResendClient(apiKey);
  const requestedRaw = payload.messageId?.trim() || `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
  const messageId =
    normalizeMessageIdForStorage(requestedRaw) ?? requestedRaw.trim().toLowerCase();
  const headers: Record<string, string> = {
    "Message-ID": messageId,
  };
  if (payload.inReplyTo?.trim()) {
    const irt = normalizeMessageIdForStorage(payload.inReplyTo) ?? payload.inReplyTo.trim();
    headers["In-Reply-To"] = irt;
  }
  if (payload.references?.trim()) {
    const refs = normalizeReferencesForStorage(payload.references) ?? payload.references.trim();
    headers["References"] = refs;
  }

  const attachments =
    payload.attachments?.map((a) => {
      const buf = Buffer.from(a.contentBase64, "base64");
      if (buf.length > OUTBOUND_MAX_ATTACHMENT_BYTES) {
        throw new Error(`Attachment "${a.filename}" exceeds ${OUTBOUND_MAX_ATTACHMENT_BYTES} bytes`);
      }
      return {
        filename: a.filename,
        content: buf,
        content_type: a.contentType,
      };
    }) ?? [];

  const { data, error } = await resend.emails.send({
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text || undefined,
    html: payload.html,
    replyTo: payload.replyTo,
    headers,
    attachments: attachments.length ? attachments : undefined,
  } as Parameters<typeof resend.emails.send>[0]);
  if (error) {
    throw new Error(error.message || "Resend send failed");
  }
  const id = data?.id?.trim();
  if (!id) throw new Error("Resend returned no message id");
  return { messageId, providerMessageId: id };
}
