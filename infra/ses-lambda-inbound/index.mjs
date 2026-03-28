/**
 * AWS Lambda: SES receipt rule → forward raw MIME to Luminum API.
 *
 * Env:
 *   LUMINUM_API_URL    — e.g. https://api.example.com (no trailing slash)
 *   LUMINUM_SES_WEBHOOK_SECRET — same as API SES_LAMBDA_INBOUND_SECRET
 *
 * IAM: allow logs; SES invokes this function (resource policy on Lambda).
 * API route: POST /api/webhook/ses-lambda-inbound
 */

export async function handler(event) {
  const apiBase = (process.env.LUMINUM_API_URL || "").replace(/\/$/, "");
  const secret = (process.env.LUMINUM_SES_WEBHOOK_SECRET || "").trim();
  if (!apiBase || !secret) {
    console.error("Missing LUMINUM_API_URL or LUMINUM_SES_WEBHOOK_SECRET");
    return;
  }

  for (const record of event.Records || []) {
    const ses = record.ses;
    if (!ses?.mail) continue;
    let raw = Buffer.alloc(0);
    // SES includes base64 raw MIME when under ~150 KB; larger messages need an S3 receipt action + GetObject.
    if (typeof ses.content === "string" && ses.content.length > 0) {
      raw = Buffer.from(ses.content, "base64");
    }
    if (raw.length === 0) {
      console.warn("No raw MIME in event; large messages may need S3 action + GetObject (not implemented in this stub).");
      continue;
    }

    const body = JSON.stringify({
      rawMimeBase64: raw.toString("base64"),
      receivedAt: new Date().toISOString(),
    });

    const res = await fetch(`${apiBase}/api/webhook/ses-lambda-inbound`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Luminum-Ses-Webhook-Secret": secret,
      },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("API error", res.status, text);
      throw new Error(`Luminum API ${res.status}: ${text}`);
    }
    console.log("Forwarded to Luminum", text);
  }
}
