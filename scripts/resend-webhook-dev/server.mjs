/**
 * Temporary Resend webhook receiver for local dev + ngrok.
 *
 * Resend posts JSON to your URL (HTTPS), expects 200 OK, uses Svix signing
 * headers. Signing secret is embedded for this temp dev script; override with
 * RESEND_WEBHOOK_SECRET if needed. If Svix verify fails, the JSON body is still
 * logged (svix verified: false) and 200 is returned so you can debug payloads.
 *
 * Run: pnpm install && node server.mjs
 * Tunnel: ngrok http 8787
 * Dashboard URL: https://<ngrok-host>/webhook
 */

import http from "node:http";
import { Webhook } from "svix";

const PORT = Number(process.env.PORT ?? 8787);
const PATH = "/webhook";
// Temp only — delete this file or remove the secret before pushing to shared remotes.
const DEV_WEBHOOK_SECRET = "whsec_el2ObERlWDR9fManykYHEaVSZ8S7IwH7";
const secret =
  process.env.RESEND_WEBHOOK_SECRET?.trim() || DEV_WEBHOOK_SECRET;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== PATH) {
    res.writeHead(req.method === "GET" && req.url === "/" ? 200 : 404);
    res.end(
      req.method === "GET" && req.url === "/"
        ? `POST JSON webhooks to ${PATH}\n`
        : "Not found\n",
    );
    return;
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch (e) {
    console.error("Body read error:", e);
    res.writeHead(400);
    res.end("bad request\n");
    return;
  }

  const svixId = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignature = req.headers["svix-signature"];

  let payload;
  let verified = false;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    verified = true;
  } catch (e) {
    console.warn(
      "[resend-webhook-dev] Svix verify failed (showing body anyway):",
      e.message,
    );
    try {
      payload = JSON.parse(raw);
    } catch {
      console.error("Body is not JSON:", raw.slice(0, 500));
      res.writeHead(400);
      res.end("invalid json\n");
      return;
    }
  }

  const ts = new Date().toISOString();
  console.log("\n========== Resend webhook", ts, "==========");
  console.log("svix verified:", verified);
  console.log("svix-id:", svixId ?? "(none)");
  console.log(JSON.stringify(payload, null, 2));
  console.log("==========================================\n");

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok\n");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Either stop the other process or pick another port:\n` +
        `  PowerShell:  $env:PORT=8790; pnpm --filter resend-webhook-dev start\n` +
        `  Find PID:    netstat -ano | findstr :${PORT}\n` +
        `  Then:        taskkill /PID <pid> /F\n`,
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(
    `Resend webhook dev server listening on http://127.0.0.1:${PORT}${PATH}`,
  );
  console.log(`ngrok: ngrok http ${PORT}`);
});
