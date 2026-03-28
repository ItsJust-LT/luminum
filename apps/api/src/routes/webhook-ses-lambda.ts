import { Router, Request, Response } from "express";
import { simpleParser } from "mailparser";
import { isEmailSystemEnabled } from "../lib/email-system.js";
import { logger } from "../lib/logger.js";
import { persistInboundEmailFromPayload, type InboundEmailWebhookLikePayload } from "../lib/inbound-email-persist.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", endpoint: "/api/webhook/ses-lambda-inbound", method: "post" });
});

router.post("/", async (req: Request, res: Response) => {
  if (!isEmailSystemEnabled()) {
    return res.status(200).json({ ok: false, accepted: false, reason: "email_system_disabled" });
  }
  const secret = (process.env.SES_LAMBDA_INBOUND_SECRET || "").trim();
  if (!secret) {
    return res.status(503).json({ ok: false, error: "SES_LAMBDA_INBOUND_SECRET not configured" });
  }
  const hdr = String(req.headers["x-luminum-ses-webhook-secret"] || req.headers["x-luminum-ses-inbound-secret"] || "");
  const auth = String(req.headers.authorization || "");
  const bearer = /^Bearer\s+(\S+)$/i.exec(auth)?.[1] || "";
  if (hdr !== secret && bearer !== secret) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const requestId = `ses-lambda-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const start = Date.now();

  try {
    const body = req.body as { rawMimeBase64?: string; receivedAt?: string };
    const b64 = typeof body?.rawMimeBase64 === "string" ? body.rawMimeBase64.trim() : "";
    if (!b64) {
      return res.status(400).json({ ok: false, error: "rawMimeBase64 required" });
    }
    let raw: Buffer;
    try {
      raw = Buffer.from(b64, "base64");
    } catch {
      return res.status(400).json({ ok: false, error: "invalid base64" });
    }
    if (raw.length === 0) {
      return res.status(400).json({ ok: false, error: "empty raw message" });
    }

    const parsed = await simpleParser(raw);
    const toList = [...(parsed.to?.value ?? []), ...(parsed.cc?.value ?? [])].map((a) => a.address || a.name || "").filter(Boolean);
    const fromVal = parsed.from?.value?.[0];
    const fromStr = fromVal ? (fromVal.name ? `${fromVal.name} <${fromVal.address}>` : fromVal.address || "") : "";

    const attachments: { filename: string; contentType: string; contentBase64: string; size?: number }[] = [];
    for (const a of parsed.attachments || []) {
      const buf = a.content;
      if (!Buffer.isBuffer(buf) || buf.length === 0) continue;
      attachments.push({
        filename: a.filename || "attachment",
        contentType: a.contentType || "application/octet-stream",
        contentBase64: buf.toString("base64"),
        size: buf.length,
      });
    }

    const headersObj: Record<string, unknown> = {};
    const hdrs = parsed.headers as unknown as Map<string, unknown> | undefined;
    if (hdrs && typeof hdrs.forEach === "function") {
      hdrs.forEach((value, key) => {
        headersObj[String(key)] = value;
      });
    }

    const payload: InboundEmailWebhookLikePayload = {
      messageId: parsed.messageId || undefined,
      from: fromStr || undefined,
      to: toList.length ? JSON.stringify(toList) : undefined,
      subject: parsed.subject || undefined,
      text: typeof parsed.text === "string" ? parsed.text : undefined,
      html: typeof parsed.html === "string" ? parsed.html : undefined,
      headers: headersObj,
      receivedAt: body.receivedAt || undefined,
      attachments: attachments.length ? attachments : undefined,
    };

    const result = await persistInboundEmailFromPayload(payload, { requestId });
    return res.json({
      ok: true,
      emailId: result.emailId,
      duplicate: result.duplicate ?? false,
      attachmentsProcessed: result.attachmentsProcessed,
      requestId,
      duration: `${Date.now() - start}ms`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`SES Lambda webhook error: ${msg}`, { requestId, stack: e instanceof Error ? e.stack : undefined });
    return res.status(500).json({ ok: false, error: msg, requestId });
  }
});

export { router as webhookSesLambdaRouter };
