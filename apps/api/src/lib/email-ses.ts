import {
  CreateEmailIdentityCommand,
  GetAccountCommand,
  GetEmailIdentityCommand,
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import { prisma } from "./prisma.js";
import type { SendViaMailAppPayload } from "./email-outbound-types.js";

const SES_RAW_MAX_BYTES = 9 * 1024 * 1024; // stay under SES ~10 MiB limit

let sesClient: SESv2Client | null | undefined;

export function isSesSendEnvironmentReady(): boolean {
  const region = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "").trim();
  return region.length > 0;
}

function getSesClient(): SESv2Client | null {
  if (sesClient === undefined) {
    const region = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "").trim();
    if (!region) {
      sesClient = null;
      return null;
    }
    sesClient = new SESv2Client({ region });
  }
  return sesClient;
}

export interface SesEmailIdentityDetails {
  verificationStatus?: string;
  dkimStatus?: string;
  dkimTokens: string[];
  signingEnabled?: boolean;
  error?: string;
}

export async function fetchSesEmailIdentityDetails(domain: string): Promise<SesEmailIdentityDetails> {
  const client = getSesClient();
  const d = domain.toLowerCase().replace(/\.$/, "").trim();
  if (!client) {
    return { dkimTokens: [], error: "AWS region not configured" };
  }
  if (!d) return { dkimTokens: [], error: "Empty domain" };
  try {
    const out = await client.send(new GetEmailIdentityCommand({ EmailIdentity: d }));
    const dkim = out.DkimAttributes;
    const tokens = (dkim?.Tokens?.filter(Boolean) as string[] | undefined) ?? [];
    return {
      verificationStatus: out.VerificationStatus,
      dkimStatus: dkim?.Status,
      dkimTokens: tokens,
      signingEnabled: dkim?.SigningEnabled,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { dkimTokens: [], error: msg };
  }
}

export interface SesAccountSummary {
  productionAccessEnabled?: boolean;
  sendingEnabled?: boolean;
  error?: string;
}

export async function fetchSesAccountSummary(): Promise<SesAccountSummary> {
  const client = getSesClient();
  if (!client) {
    return { error: "AWS region not configured" };
  }
  try {
    const out = await client.send(new GetAccountCommand({}));
    return {
      productionAccessEnabled: out.ProductionAccessEnabled,
      sendingEnabled: out.SendingEnabled,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** True when SES domain identity is SUCCESS in AWS (for DB sync and eligibility). */
export async function fetchSesDomainVerificationStatus(domain: string): Promise<{
  ok: boolean;
  status?: string;
  error?: string;
}> {
  const details = await fetchSesEmailIdentityDetails(domain);
  if (details.error && !details.verificationStatus) {
    return { ok: false, error: details.error };
  }
  const status = details.verificationStatus;
  if (status === "SUCCESS") {
    return { ok: true, status };
  }
  return {
    ok: false,
    status,
    error: status ? `SES identity status: ${status}` : "SES identity not found or not verified",
  };
}

export async function syncOrganizationSesDomainInDb(organizationId: string): Promise<{
  ok: boolean;
  error?: string;
  domain?: string;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { email_domain_id: true, email_domain: { select: { domain: true } } },
  });
  const domain = org?.email_domain?.domain;
  if (!domain) {
    return { ok: false, error: "No email domain for organization" };
  }
  const check = await fetchSesDomainVerificationStatus(domain);
  const now = new Date();
  if (check.ok) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { email_ses_verified_at: now, email_ses_last_error: null },
    });
    return { ok: true, domain };
  }
  const clearVerified = check.status === "FAILED" || check.status === "NOT_STARTED";
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(clearVerified ? { email_ses_verified_at: null } : {}),
      email_ses_last_error: check.error ?? "SES verification failed",
    },
  });
  return { ok: false, error: check.error, domain };
}

export async function createSesDomainIdentity(domain: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSesClient();
  const d = domain.toLowerCase().replace(/\.$/, "").trim();
  if (!client) {
    return { ok: false, error: "AWS region not configured" };
  }
  if (!d) return { ok: false, error: "Empty domain" };
  try {
    await client.send(new CreateEmailIdentityCommand({ EmailIdentity: d }));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already exists/i.test(msg) || /AlreadyExists/i.test(msg)) {
      return { ok: true };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Throws if the org cannot send: domain identity must be SUCCESS; if SES_FROM_STRICT=true, Easy DKIM must be SUCCESS.
 */
export async function assertOrgCanSendViaSes(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { email_domain: { select: { domain: true } } },
  });
  const domain = org?.email_domain?.domain;
  if (!domain) {
    throw new Error("No email domain configured for this organization");
  }
  const id = await fetchSesEmailIdentityDetails(domain);
  if (id.error && !id.verificationStatus) {
    throw new Error(`SES: ${id.error}`);
  }
  if (id.verificationStatus !== "SUCCESS") {
    throw new Error(
      `Domain is not verified in Amazon SES (${id.verificationStatus ?? "unknown"}). Add DNS records and use Verify DNS or Register domain in SES.`
    );
  }
  const strict = /^true$/i.test((process.env.SES_FROM_STRICT || "").trim());
  if (strict && id.dkimStatus && id.dkimStatus !== "SUCCESS") {
    throw new Error(`SES DKIM is not ready (${id.dkimStatus}). Publish the SES DKIM CNAME records and wait for propagation.`);
  }
}

function encodeMimeHeaderValue(s: string): string {
  return s.replace(/\r?\n/g, " ").replace(/\0/g, "");
}

function rfc822Date(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = days[d.getUTCDay()];
  const date = d.getUTCDate();
  const mon = months[d.getUTCMonth()];
  const y = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${day}, ${date} ${mon} ${y} ${hh}:${mm}:${ss} +0000`;
}

function buildRawMime(payload: SendViaMailAppPayload): Buffer {
  const boundary = `bnd-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const messageId = payload.messageId?.trim() || `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
  const subject = encodeMimeHeaderValue(payload.subject || "");
  const headers: string[] = [
    `From: ${encodeMimeHeaderValue(payload.from)}`,
    `To: ${payload.to.map((t) => encodeMimeHeaderValue(t)).join(", ")}`,
    `Subject: ${subject}`,
    `Date: ${rfc822Date(new Date())}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
  ];
  if (payload.replyTo?.trim()) {
    headers.push(`Reply-To: ${encodeMimeHeaderValue(payload.replyTo.trim())}`);
  }
  if (payload.inReplyTo?.trim()) {
    headers.push(`In-Reply-To: ${encodeMimeHeaderValue(payload.inReplyTo.trim())}`);
  }
  if (payload.references?.trim()) {
    headers.push(`References: ${encodeMimeHeaderValue(payload.references.trim())}`);
  }

  const text = payload.text || "";
  const html = payload.html || "";
  const atts = payload.attachments ?? [];
  const hasParts = (text && html) || atts.length > 0;

  let body = "";
  if (!hasParts) {
    if (html) {
      headers.push("Content-Type: text/html; charset=UTF-8");
      headers.push("Content-Transfer-Encoding: 8bit");
    } else {
      headers.push("Content-Type: text/plain; charset=UTF-8");
      headers.push("Content-Transfer-Encoding: 8bit");
    }
    body = headers.join("\r\n") + "\r\n\r\n" + (html || text);
  } else {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const chunks: string[] = [];
    chunks.push(headers.join("\r\n"));
    chunks.push("");
    if (text || html) {
      chunks.push(`--${boundary}`);
      if (text && html) {
        const sub = `alt-${boundary}`;
        chunks.push(`Content-Type: multipart/alternative; boundary="${sub}"`);
        chunks.push("");
        chunks.push(`--${sub}`);
        chunks.push("Content-Type: text/plain; charset=UTF-8");
        chunks.push("Content-Transfer-Encoding: 8bit");
        chunks.push("");
        chunks.push(text);
        chunks.push(`--${sub}`);
        chunks.push("Content-Type: text/html; charset=UTF-8");
        chunks.push("Content-Transfer-Encoding: 8bit");
        chunks.push("");
        chunks.push(html);
        chunks.push(`--${sub}--`);
      } else if (html) {
        chunks.push("Content-Type: text/html; charset=UTF-8");
        chunks.push("Content-Transfer-Encoding: 8bit");
        chunks.push("");
        chunks.push(html);
      } else {
        chunks.push("Content-Type: text/plain; charset=UTF-8");
        chunks.push("Content-Transfer-Encoding: 8bit");
        chunks.push("");
        chunks.push(text);
      }
      chunks.push("");
    }
    for (const a of atts) {
      const raw = Buffer.from(a.contentBase64, "base64");
      const b64 = raw.toString("base64");
      const fn = encodeMimeHeaderValue(a.filename || "attachment");
      const ct = encodeMimeHeaderValue(a.contentType || "application/octet-stream");
      chunks.push(`--${boundary}`);
      chunks.push(`Content-Type: ${ct}; name="${fn}"`);
      chunks.push(`Content-Disposition: attachment; filename="${fn}"`);
      chunks.push("Content-Transfer-Encoding: base64");
      chunks.push("");
      chunks.push(b64.match(/.{1,76}/g)?.join("\r\n") ?? b64);
      chunks.push("");
    }
    chunks.push(`--${boundary}--\r\n`);
    body = chunks.join("\r\n");
  }

  const buf = Buffer.from(body, "utf8");
  if (buf.length > SES_RAW_MAX_BYTES) {
    throw new Error("Message too large for Amazon SES raw send");
  }
  return buf;
}

export interface SesSendResult {
  /** Amazon SES MessageId */
  providerMessageId: string;
}

export async function sendViaSes(payload: SendViaMailAppPayload): Promise<SesSendResult> {
  const client = getSesClient();
  if (!client) {
    throw new Error("SES not configured (set AWS_REGION or AWS_DEFAULT_REGION and credentials)");
  }
  const raw = buildRawMime(payload);
  const input: SendEmailCommandInput = {
    FromEmailAddress: payload.from,
    Destination: { ToAddresses: payload.to },
    Content: { Raw: { Data: new Uint8Array(raw) } },
    ...(process.env.SES_CONFIGURATION_SET?.trim()
      ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET.trim() }
      : {}),
    EmailTags: [{ Name: "luminum_send", Value: "ses" }],
  };

  const out = await client.send(new SendEmailCommand(input));
  const mid = out.MessageId?.trim();
  if (!mid) {
    throw new Error("SES returned no MessageId");
  }
  return { providerMessageId: mid };
}
