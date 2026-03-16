import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { upload } from "../lib/storage/s3.js";
import { emailAttachmentKey } from "../lib/storage/keys.js";
import crypto from "crypto";

const router = Router();

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

    // For webhook routes, we need the raw body. Since express.json() has already parsed it,
    // we'll stringify it back for signature verification
    const bodyText = JSON.stringify(req.body);
    if (!checkSignature(WEBHOOK_SECRET, bodyText, ts, sig)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body;
    const rawMessageId = payload.messageId?.trim() || null;
    const messageId = rawMessageId ? rawMessageId.toLowerCase() : null;

    if (messageId) {
      const existing = await prisma.email.findUnique({ where: { messageId }, select: { id: true } });
      if (existing) return res.json({ ok: true, duplicate: true, emailId: existing.id });
    }

    let fromString: string | null = null;
    let toString: string | null = null;
    if (payload.from) {
      fromString = typeof payload.from === "string" ? payload.from :
        Array.isArray(payload.from) ? JSON.stringify(payload.from) :
        payload.from.email || null;
    }
    if (payload.to) {
      toString = typeof payload.to === "string" ? payload.to :
        Array.isArray(payload.to) ? JSON.stringify(payload.to) :
        payload.to.email || null;
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

    const textContent = payload.text?.trim() || null;
    const htmlContent = payload.html?.trim() || null;

    const contentCanonical = [organizationId ?? "", fromString ?? "", toString ?? "", (payload.subject ?? "").trim(), textContent ?? "", htmlContent ?? ""].join("\n");
    const contentHash = crypto.createHash("md5").update(contentCanonical).digest("hex");
    const existingByHash = await prisma.email.findUnique({ where: { contentHash }, select: { id: true } });
    if (existingByHash) return res.json({ ok: true, duplicate: true, emailId: existingByHash.id });

    let dedupeKey: string | null = null;
    if (!messageId && organizationId && receivedAt) {
      const dc = [organizationId, fromString ?? "", toString ?? "", (payload.subject ?? "").trim(), receivedAt.toISOString().slice(0, 19)].join("\n");
      dedupeKey = crypto.createHash("sha256").update(dc).digest("hex");
    }

    const email = await prisma.email.create({
      data: { organization_id: organizationId, from: fromString, to: toString, subject: payload.subject ?? null, text: textContent, html: htmlContent, headers: payload.headers ?? {}, receivedAt, messageId, dedupeKey, contentHash },
    });

    if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
      const base = config.apiUrl.replace(/\/$/, "");
      const atts: { emailId: string; filename: string; contentType: string; size: number | null; r2Key: string; url: string }[] = [];
      for (let i = 0; i < payload.attachments.length; i++) {
        const a = payload.attachments[i] as { r2Key?: string; storage_key?: string; filename?: string; contentType?: string; size?: number; contentBase64?: string };
        let key = a.r2Key || a.storage_key || "";
        if (!key && a.contentBase64 && (a.filename || a.contentType)) {
          try {
            const buffer = Buffer.from(a.contentBase64, "base64");
            const filename = a.filename || `attachment-${i + 1}`;
            const storageKey = emailAttachmentKey(email.id, String(i), filename);
            const result = await upload(buffer, storageKey, { contentType: a.contentType || "application/octet-stream" });
            key = result.key;
          } catch (err) {
            logger.error("Webhook attachment upload failed", { emailId: email.id, index: i, requestId });
          }
        }
        if (!key) continue;
        const filename = a.filename || `attachment-${i + 1}`;
        const contentType = a.contentType || "application/octet-stream";
        atts.push({
          emailId: email.id,
          filename,
          contentType,
          size: a.size ?? null,
          r2Key: key,
          url: `${base}/api/files/${encodeURIComponent(key)}`,
        });
      }
      if (atts.length > 0) await prisma.attachment.createMany({ data: atts });
    }

    logger.info("Email received (inbound)", { from: fromString, to: toString, subject: payload.subject ?? null, emailId: email.id, organizationId, requestId }, requestId);

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
          data: { emailId: email.id, fromEmail, fromName: notificationFromName, subject: payload.subject || "(No subject)", organizationId, url: emailUrl },
          target: { organizationId },
        });
      } catch {}
    }

    res.json({ ok: true, emailId: email.id, attachmentsProcessed: payload.attachments?.length || 0, requestId, duration: `${Date.now() - startTime}ms` });
  } catch (error: any) {
    logger.error(`Webhook error: ${error instanceof Error ? error.message : String(error)}`, { requestId, stack: error instanceof Error ? error.stack : undefined });
    res.status(500).json({ error: "server error", message: error.message, requestId });
  }
});

export { router as webhookEmailsRouter };
