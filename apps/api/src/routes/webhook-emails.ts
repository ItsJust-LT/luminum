import { Router, Request, Response } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger.js";
import { isEmailSystemEnabled } from "../lib/email-system.js";
import { persistInboundEmailFromPayload, type InboundEmailWebhookLikePayload } from "../lib/inbound-email-persist.js";

const router = Router();

function checkSignature(secret: string, body: string, ts: string, sig: string): boolean {
  const pre = ts + "." + body;
  const expected = crypto.createHmac("sha256", secret).update(pre).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
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

    const rawBody = (req as Request & { rawBody?: string }).rawBody;
    const bodyText = typeof rawBody === "string" && rawBody.length > 0 ? rawBody : JSON.stringify(req.body);
    if (!checkSignature(WEBHOOK_SECRET, bodyText, ts, sig)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body as InboundEmailWebhookLikePayload;
    const result = await persistInboundEmailFromPayload(payload, { requestId });

    res.json({
      ok: true,
      emailId: result.emailId,
      duplicate: result.duplicate ?? false,
      attachmentsProcessed: result.attachmentsProcessed,
      requestId,
      duration: `${Date.now() - startTime}ms`,
    });
  } catch (error: unknown) {
    logger.error(`Webhook error: ${error instanceof Error ? error.message : String(error)}`, {
      requestId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: "server error", message: error instanceof Error ? error.message : String(error), requestId });
  }
});

export { router as webhookEmailsRouter };
