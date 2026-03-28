import type { Prisma } from "@luminum/database";
import crypto from "crypto";
import { prisma } from "./prisma.js";
import { config } from "../config.js";
import { logger } from "./logger.js";
import { upload, isStorageConfigured } from "./storage/s3.js";
import { emailAttachmentKey, orgAttachmentsEmailsKey } from "./storage/keys.js";
import { updateOrganizationStorage } from "./utils/storage.js";
import { extractZipsFromBodies, type ExtractedZipPart } from "./email-binary-body.js";

/** PostgreSQL text/JSON cannot store U+0000; inbound MIME can contain NUL in headers or bodies. */
export function stripNul(s: string): string {
  return s.includes("\0") ? s.replace(/\u0000/g, "") : s;
}

export function stripNulDeep(value: unknown): unknown {
  if (typeof value === "string") return stripNul(value);
  if (Array.isArray(value)) return value.map(stripNulDeep);
  if (value !== null && typeof value === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      o[stripNul(k)] = stripNulDeep(v);
    }
    return o;
  }
  return value;
}

function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.trim();
}

function extractDomainFromEmail(emailAddress: string): string | null {
  const parts = emailAddress.split("@");
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase().trim();
}

export async function findOrganizationByEmail(emailAddress: string): Promise<string | null> {
  try {
    const domain = extractDomainFromEmail(emailAddress);
    if (!domain) return null;
    const website = await prisma.websites.findUnique({
      where: { domain },
      select: {
        organization_id: true,
        organization: { select: { id: true, emails_enabled: true } },
      },
    });
    if (!website || !website.organization?.emails_enabled) return null;
    return website.organization_id;
  } catch {
    return null;
  }
}

export interface InboundEmailWebhookLikePayload {
  messageId?: unknown;
  from?: unknown;
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  headers?: unknown;
  receivedAt?: unknown;
  attachments?: unknown;
}

export interface PersistInboundEmailOptions {
  requestId?: string;
}

export interface PersistInboundEmailResult {
  ok: true;
  emailId: string;
  duplicate?: boolean;
  attachmentsProcessed: number;
}

/**
 * Create inbound email row, upload attachments to MinIO, notify org — shared by legacy mail webhook and SES Lambda webhook.
 */
export async function persistInboundEmailFromPayload(
  payload: InboundEmailWebhookLikePayload,
  options: PersistInboundEmailOptions = {}
): Promise<PersistInboundEmailResult> {
  const requestId = options.requestId ?? `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const startTime = Date.now();

  const rawMessageId = payload.messageId != null ? stripNul(String(payload.messageId).trim()) || null : null;
  const messageId = rawMessageId ? rawMessageId.toLowerCase() : null;

  if (messageId) {
    const existing = await prisma.email.findUnique({ where: { messageId }, select: { id: true } });
    if (existing) return { ok: true, emailId: existing.id, duplicate: true, attachmentsProcessed: 0 };
  }

  let fromString: string | null = null;
  let toString: string | null = null;
  if (payload.from) {
    fromString =
      typeof payload.from === "string"
        ? stripNul(payload.from)
        : Array.isArray(payload.from)
          ? stripNul(JSON.stringify(payload.from))
          : (payload.from as { email?: unknown }).email != null
            ? stripNul(String((payload.from as { email: unknown }).email))
            : null;
  }
  if (payload.to) {
    toString =
      typeof payload.to === "string"
        ? stripNul(payload.to)
        : Array.isArray(payload.to)
          ? stripNul(JSON.stringify(payload.to))
          : (payload.to as { email?: unknown }).email != null
            ? stripNul(String((payload.to as { email: unknown }).email))
            : null;
  }

  let receivedAt = payload.receivedAt ? new Date(String(payload.receivedAt)) : new Date();

  let organizationId: string | null = null;
  if (toString) {
    let toEmail: string | null = null;
    try {
      const parsed = JSON.parse(toString);
      toEmail = Array.isArray(parsed) ? extractEmailAddress(parsed[0]) : extractEmailAddress(parsed);
    } catch {
      toEmail = extractEmailAddress(toString);
    }
    if (toEmail) organizationId = await findOrganizationByEmail(toEmail);
  }

  const subjectSanitized = payload.subject != null ? stripNul(String(payload.subject).trim()) || null : null;
  const textRaw = payload.text != null ? String(payload.text).trim() : "";
  const htmlRaw = payload.html != null ? String(payload.html).trim() : "";
  const zipNorm = isStorageConfigured()
    ? extractZipsFromBodies(textRaw || null, htmlRaw || null)
    : { text: textRaw || null, html: htmlRaw || null, extracted: [] as ExtractedZipPart[] };
  const textAfterZip = zipNorm.text ?? (textRaw || null);
  const htmlAfterZip = zipNorm.html ?? (htmlRaw || null);
  const bodyForPg = (s: string | null): string | null => {
    if (s == null) return null;
    const t = stripNul(s).trim();
    return t.length > 0 ? t : null;
  };
  const textContent = bodyForPg(textAfterZip);
  const htmlContent = bodyForPg(htmlAfterZip);
  const extractedZips = zipNorm.extracted;

  const contentCanonical = [organizationId ?? "", fromString ?? "", toString ?? "", subjectSanitized ?? "", textContent ?? "", htmlContent ?? ""].join("\n");
  const contentHash = crypto.createHash("md5").update(contentCanonical).digest("hex");
  const existingByHash = await prisma.email.findUnique({ where: { contentHash }, select: { id: true } });
  if (existingByHash) return { ok: true, emailId: existingByHash.id, duplicate: true, attachmentsProcessed: 0 };

  let dedupeKey: string | null = null;
  if (!messageId && organizationId && receivedAt) {
    const dc = [organizationId, fromString ?? "", toString ?? "", subjectSanitized ?? "", receivedAt.toISOString().slice(0, 19)].join("\n");
    dedupeKey = crypto.createHash("sha256").update(dc).digest("hex");
  }

  const headersSafe: Prisma.InputJsonValue =
    payload.headers != null && typeof payload.headers === "object" && !Array.isArray(payload.headers)
      ? (stripNulDeep(payload.headers) as Prisma.InputJsonValue)
      : {};

  const email = await prisma.email.create({
    data: {
      organization_id: organizationId,
      from: fromString,
      to: toString,
      subject: subjectSanitized,
      text: textContent,
      html: htmlContent,
      headers: headersSafe,
      receivedAt,
      messageId,
      dedupeKey,
      contentHash,
    },
  });

  const base = config.apiUrl.replace(/\/$/, "");
  const atts: { emailId: string; filename: string; contentType: string; size: number | null; r2Key: string; url: string }[] = [];
  let attIndex = 0;

  if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
    for (let i = 0; i < payload.attachments.length; i++) {
      const a = payload.attachments[i] as {
        r2Key?: string;
        storage_key?: string;
        filename?: string;
        contentType?: string;
        size?: number;
        contentBase64?: string;
      };
      let key = a.r2Key || a.storage_key || "";
      if (!key && a.contentBase64 && (a.filename || a.contentType)) {
        try {
          const buffer = Buffer.from(a.contentBase64, "base64");
          const filename = stripNul(a.filename || `attachment-${attIndex + 1}`);
          const storageKey = organizationId
            ? orgAttachmentsEmailsKey(organizationId, email.id, String(attIndex), filename)
            : emailAttachmentKey(email.id, String(attIndex), filename);
          const result = await upload(buffer, storageKey, { contentType: a.contentType || "application/octet-stream" });
          key = result.key;
          if (organizationId) {
            try {
              await updateOrganizationStorage(organizationId, result.bytes);
            } catch {
              /* ignore */
            }
          }
        } catch {
          logger.error("Inbound attachment upload failed", { emailId: email.id, index: attIndex, requestId });
        }
      }
      if (key) {
        const filename = stripNul(a.filename || `attachment-${attIndex + 1}`);
        const contentType = stripNul(a.contentType || "application/octet-stream");
        atts.push({
          emailId: email.id,
          filename,
          contentType,
          size: a.size ?? null,
          r2Key: key,
          url: `${base}/api/files/${encodeURIComponent(key)}`,
        });
        attIndex += 1;
      }
    }
  }

  const attCountBeforeZips = atts.length;
  for (const z of extractedZips) {
    try {
      const filename = stripNul(z.filename);
      const storageKey = organizationId
        ? orgAttachmentsEmailsKey(organizationId, email.id, String(attIndex), filename)
        : emailAttachmentKey(email.id, String(attIndex), filename);
      const result = await upload(z.buffer, storageKey, { contentType: z.contentType });
      if (organizationId) {
        try {
          await updateOrganizationStorage(organizationId, result.bytes);
        } catch {
          /* ignore */
        }
      }
      atts.push({
        emailId: email.id,
        filename,
        contentType: z.contentType,
        size: z.buffer.length,
        r2Key: result.key,
        url: `${base}/api/files/${encodeURIComponent(result.key)}`,
      });
      attIndex += 1;
    } catch {
      logger.error("Inbound embedded zip upload failed", { emailId: email.id, index: attIndex, requestId });
    }
  }

  if (extractedZips.length > 0 && atts.length === attCountBeforeZips) {
    const rawCanonical = [organizationId ?? "", fromString ?? "", toString ?? "", subjectSanitized ?? "", textRaw || "", htmlRaw || ""].join("\n");
    const rawHash = crypto.createHash("md5").update(rawCanonical).digest("hex");
    const hashConflict = await prisma.email.findFirst({ where: { contentHash: rawHash, NOT: { id: email.id } }, select: { id: true } });
    await prisma.email.update({
      where: { id: email.id },
      data: {
        text: textRaw || null,
        html: htmlRaw || null,
        contentHash: hashConflict ? null : rawHash,
      },
    });
    logger.warn("Inbound: embedded ZIP upload failed; restored raw body", { emailId: email.id, requestId });
  }

  if (atts.length > 0) await prisma.attachment.createMany({ data: atts });

  logger.info(
    "Email received (inbound)",
    { from: fromString, to: toString, subject: subjectSanitized, emailId: email.id, organizationId, requestId },
    requestId
  );

  if (organizationId) {
    try {
      const { sendNotification } = await import("./notifications/helpers.js");
      let fromEmail = "";
      let fromName = "";
      if (fromString) {
        const nameMatch = fromString.trim().match(/^(.+?)\s*<([^>]+)>$/);
        if (nameMatch) {
          fromName = nameMatch[1].trim().replace(/^['"]|['"]$/g, "");
          fromEmail = nameMatch[2].trim();
        } else {
          fromEmail = fromString.trim();
          fromName = fromEmail;
        }
      }
      if (!fromEmail) fromEmail = "unknown@unknown";
      if (!fromName) fromName = fromEmail;
      const displayFrom = fromEmail.includes("+") && fromEmail.includes("@") ? fromEmail.replace(/^([^+]+)\+[^@]+@/, "$1@") : fromEmail;
      const notificationFromName = fromName === fromEmail ? displayFrom : fromName;

      const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { slug: true } });
      const emailUrl = org?.slug ? `/${org.slug}/emails/${email.id}` : `/emails/${email.id}`;
      await sendNotification({
        type: "email_received",
        data: {
          emailId: email.id,
          fromEmail,
          fromName: notificationFromName,
          subject: subjectSanitized || "(No subject)",
          organizationId,
          url: emailUrl,
        },
        target: { organizationId },
      });
    } catch {
      /* ignore notification errors */
    }
  }

  logger.debug("Inbound persist done", { durationMs: Date.now() - startTime }, requestId);

  return { ok: true, emailId: email.id, attachmentsProcessed: atts.length };
}
