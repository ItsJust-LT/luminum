import { Router, Request, Response } from "express";
import { Resend } from "resend";
import { isEmailSystemEnabled } from "../lib/email-system.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { decryptEmailSecret } from "../lib/email-secrets.js";
import { findOrganizationByEmail, persistInboundEmailFromPayload } from "../lib/inbound-email-persist.js";
import { createResendClient } from "../lib/resend-org.js";

const router = Router();

function svixHeadersFromReq(req: Request): { id: string; timestamp: string; signature: string } {
  const pick = (name: string): string => {
    const v = req.headers[name] ?? req.headers[name.toLowerCase()];
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" ? s : "";
  };
  return {
    id: pick("svix-id"),
    timestamp: pick("svix-timestamp"),
    signature: pick("svix-signature"),
  };
}

router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", endpoint: "/api/webhook/resend-inbound", method: "post", events: ["email.received"] });
});

router.post("/", async (req: Request, res: Response) => {
  if (!isEmailSystemEnabled()) {
    return res.status(200).json({ ok: false, accepted: false, reason: "email_system_disabled" });
  }
  const raw =
    Buffer.isBuffer(req.body) ? req.body.toString("utf8") : typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  if (!raw) {
    return res.status(400).json({ ok: false, error: "empty body" });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return res.status(400).json({ ok: false, error: "invalid json" });
  }

  const body = parsed as { type?: string; data?: { to?: string[]; email_id?: string } };
  if (body.type !== "email.received") {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const toList = Array.isArray(body.data?.to) ? body.data!.to : [];
  let organizationId: string | null = null;
  for (const addr of toList) {
    const orgId = await findOrganizationByEmail(String(addr).trim());
    if (orgId) {
      organizationId = orgId;
      break;
    }
  }
  if (!organizationId) {
    logger.warn("Resend webhook: no organization for recipients", { to: toList });
    return res.status(404).json({ ok: false, error: "unknown_recipient_domain" });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { resend_webhook_secret_ciphertext: true, resend_api_key_ciphertext: true },
  });
  if (!org?.resend_webhook_secret_ciphertext || !org.resend_api_key_ciphertext) {
    return res.status(503).json({ ok: false, error: "org_resend_not_configured" });
  }

  let webhookSecret: string;
  let apiKey: string;
  try {
    webhookSecret = decryptEmailSecret(org.resend_webhook_secret_ciphertext);
    apiKey = decryptEmailSecret(org.resend_api_key_ciphertext);
  } catch (e) {
    logger.error("Resend webhook decrypt failed", { error: String(e) });
    return res.status(503).json({ ok: false, error: "decrypt_failed" });
  }

  const verifier = new Resend("re_placeholder_for_verify_only");
  let event: { type: string; data: { email_id?: string } };
  try {
    event = verifier.webhooks.verify({
      payload: raw,
      headers: svixHeadersFromReq(req),
      webhookSecret,
    }) as { type: string; data: { email_id?: string } };
  } catch (e) {
    logger.warn("Resend webhook signature invalid", { organizationId, error: String(e) });
    return res.status(401).json({ ok: false, error: "invalid_signature" });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return res.status(400).json({ ok: false, error: "missing email_id" });
  }

  const requestId = `resend-inbound-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const resend = createResendClient(apiKey);

  try {
    const received = await resend.emails.receiving.get(emailId);
    if (received.error || !received.data) {
      logger.error("Resend receiving.get failed", { emailId, error: received.error?.message });
      return res.status(502).json({ ok: false, error: "resend_fetch_failed" });
    }
    const em = received.data;

    const attachmentPayloads: { filename: string; contentType: string; size?: number; contentBase64: string }[] = [];
    const attList = await resend.emails.receiving.attachments.list({ emailId });
    const attRowsRaw = (attList as unknown as { data?: unknown })?.data;
    const attRows = Array.isArray(attRowsRaw)
      ? attRowsRaw
      : (attRowsRaw as { data?: unknown[] } | undefined)?.data ?? [];
    for (const att of attRows) {
      try {
        const row = att as {
          download_url?: string;
          filename?: string;
          content_type?: string;
          contentType?: string;
          size?: number;
        };
        const url = row.download_url;
        if (!url) continue;
        const r = await fetch(url);
        if (!r.ok) continue;
        const buf = Buffer.from(await r.arrayBuffer());
        attachmentPayloads.push({
          filename: row.filename || "attachment",
          contentType: row.content_type || row.contentType || "application/octet-stream",
          size: typeof row.size === "number" ? row.size : buf.length,
          contentBase64: buf.toString("base64"),
        });
      } catch {
        /* skip attachment */
      }
    }

    const result = await persistInboundEmailFromPayload(
      {
        messageId: em.message_id,
        from: em.from,
        to: JSON.stringify(em.to ?? []),
        subject: em.subject,
        text: em.text ?? undefined,
        html: em.html ?? undefined,
        headers: em.headers ?? undefined,
        receivedAt: em.created_at,
        attachments: attachmentPayloads.length ? attachmentPayloads : undefined,
      },
      { requestId, organizationId }
    );

    return res.status(200).json({ ok: true, emailId: result.emailId, duplicate: result.duplicate });
  } catch (e) {
    logger.logError(e, "Resend inbound processing failed", { emailId, organizationId }, requestId);
    return res.status(500).json({ ok: false, error: "processing_failed" });
  }
});

export { router as webhookResendInboundRouter };
