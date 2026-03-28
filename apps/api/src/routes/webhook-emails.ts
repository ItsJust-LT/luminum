import { Router, Request, Response } from "express";
import type { Prisma } from "@luminum/database";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { upload, isStorageConfigured } from "../lib/storage/s3.js";
import { emailAttachmentKey, orgAttachmentsEmailsKey } from "../lib/storage/keys.js";
import { updateOrganizationStorage } from "../lib/utils/storage.js";
import crypto from "crypto";
import { isEmailSystemEnabled } from "../lib/email-system.js";
import { extractZipsFromBodies, type ExtractedZipPart } from "../lib/email-binary-body.js";

const router = Router();

/** PostgreSQL text/JSON cannot store U+0000; inbound MIME can contain NUL in headers or bodies. */
function stripNul(s: string): string {
  return s.includes("\0") ? s.replace(/\u0000/g, "") : s;
}

function stripNulDeep(value: unknown): unknown {
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

function checkSignature(secret: string, body: string, ts: string, sig: string): boolean {
  const pre = ts + "." + body;
  const expected = crypto.createHmac("sha256", secret).update(pre).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch { return false; }
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

async function findOrganizationByEmail(emailAddress: string): Promise<string | null> {
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
  } catch { return null; }
}

router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", endpoint: "/api/webhook/emails", method: "post" });
});

router.post("/", async (req: Request, res: Response) => {
  if (!isEmailSystemEnabled()) {
    return res.status(200).json({ ok: false, accepted: false, reason: "email_system_disabled" });
  }
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
  const startTime = Date.now();
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    const ts = req.headers["x-webhook-timestamp"] as string;
    const sig = req.headers["x-webhook-signature"] as string;
    if (!ts || !sig) return res.status(401).json({ error: "Missing signature" });

    const now = Math.floor(Date.now() / 1000);
    const tnum = parseInt(ts, 10);
    if (isNaN(tnum) || Math.abs(now - tnum) > 300) {
      return res.status(401).json({ error: "Timestamp too old" });
    }

    // Must verify HMAC over the exact bytes the mail service sent. Go uses json.Marshal;
    // JSON.stringify(req.body) can reorder keys and break the signature → 401.
    const rawBody = (req as Request & { rawBody?: string }).rawBody;
    const bodyText = typeof rawBody === "string" && rawBody.length > 0 ? rawBody : JSON.stringify(req.body);
    if (!checkSignature(WEBHOOK_SECRET, bodyText, ts, sig)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body;
    const rawMessageId = payload.messageId != null ? stripNul(String(payload.messageId).trim()) || null : null;
    const messageId = rawMessageId ? rawMessageId.toLowerCase() : null;

    if (messageId) {
      const existing = await prisma.email.findUnique({ where: { messageId }, select: { id: true } });
      if (existing) return res.json({ ok: true, duplicate: true, emailId: existing.id });
    }

    let fromString: string | null = null;
    let toString: string | null = null;
    if (payload.from) {
      fromString = typeof payload.from === "string" ? stripNul(payload.from) :
        Array.isArray(payload.from) ? stripNul(JSON.stringify(payload.from)) :
        payload.from.email != null ? stripNul(String(payload.from.email)) : null;
    }
    if (payload.to) {
      toString = typeof payload.to === "string" ? stripNul(payload.to) :
        Array.isArray(payload.to) ? stripNul(JSON.stringify(payload.to)) :
        payload.to.email != null ? stripNul(String(payload.to.email)) : null;
    }

    let receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();

    let organizationId: string | null = null;
    if (toString) {
      let toEmail: string | null = null;
      try {
        const parsed = JSON.parse(toString);
        toEmail = Array.isArray(parsed) ? extractEmailAddress(parsed[0]) : extractEmailAddress(parsed);
      } catch { toEmail = extractEmailAddress(toString); }
      if (toEmail) organizationId = await findOrganizationByEmail(toEmail);
    }

    const subjectSanitized = payload.subject != null ? stripNul(String(payload.subject).trim()) || null : null;
    const textRaw = payload.text != null ? stripNul(String(payload.text)).trim() : "";
    const htmlRaw = payload.html != null ? stripNul(String(payload.html)).trim() : "";
    /** Avoid stripping ZIP from body when we cannot upload (would lose the blob). */
    const zipNorm = isStorageConfigured()
      ? extractZipsFromBodies(textRaw || null, htmlRaw || null)
      : { text: textRaw || null, html: htmlRaw || null, extracted: [] as ExtractedZipPart[] };
    const textContent = zipNorm.text ?? (textRaw || null);
    const htmlContent = zipNorm.html ?? (htmlRaw || null);
    const extractedZips = zipNorm.extracted;

    const contentCanonical = [organizationId ?? "", fromString ?? "", toString ?? "", subjectSanitized ?? "", textContent ?? "", htmlContent ?? ""].join("\n");
    const contentHash = crypto.createHash("md5").update(contentCanonical).digest("hex");
    const existingByHash = await prisma.email.findUnique({ where: { contentHash }, select: { id: true } });
    if (existingByHash) return res.json({ ok: true, duplicate: true, emailId: existingByHash.id });

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
        const a = payload.attachments[i] as { r2Key?: string; storage_key?: string; filename?: string; contentType?: string; size?: number; contentBase64?: string };
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
              } catch {}
            }
          } catch (err) {
            logger.error("Webhook attachment upload failed", { emailId: email.id, index: attIndex, requestId });
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
          } catch {}
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
      } catch (err) {
        logger.error("Webhook embedded zip upload failed", { emailId: email.id, index: attIndex, requestId });
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
      logger.warn("Webhook: embedded ZIP upload failed; restored raw body", { emailId: email.id, requestId });
    }

    if (atts.length > 0) await prisma.attachment.createMany({ data: atts });

    logger.info("Email received (inbound)", { from: fromString, to: toString, subject: subjectSanitized, emailId: email.id, organizationId, requestId }, requestId);

    if (organizationId) {
      try {
        const { sendNotification } = await import("../lib/notifications/helpers.js");
        let fromEmail = "", fromName = "";
        if (fromString) {
          const nameMatch = fromString.trim().match(/^(.+?)\s*<([^>]+)>$/);
          if (nameMatch) { fromName = nameMatch[1].trim().replace(/^['"]|['"]$/g, ""); fromEmail = nameMatch[2].trim(); }
          else { fromEmail = fromString.trim(); fromName = fromEmail; }
        }
        if (!fromEmail) fromEmail = "unknown@unknown";
        if (!fromName) fromName = fromEmail;
        const displayFrom = fromEmail.includes("+") && fromEmail.includes("@") ? fromEmail.replace(/^([^+]+)\+[^@]+@/, "$1@") : fromEmail;
        const notificationFromName = fromName === fromEmail ? displayFrom : fromName;

        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { slug: true } });
        const emailUrl = org?.slug ? `/${org.slug}/emails/${email.id}` : `/emails/${email.id}`;
        await sendNotification({
          type: "email_received",
          data: { emailId: email.id, fromEmail, fromName: notificationFromName, subject: subjectSanitized || "(No subject)", organizationId, url: emailUrl },
          target: { organizationId },
        });
      } catch {}
    }

    res.json({
      ok: true,
      emailId: email.id,
      attachmentsProcessed: atts.length,
      requestId,
      duration: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    logger.error(`Webhook error: ${error instanceof Error ? error.message : String(error)}`, { requestId, stack: error instanceof Error ? error.stack : undefined });
    res.status(500).json({ error: "server error", message: error.message, requestId });
  }
});

export { router as webhookEmailsRouter };
