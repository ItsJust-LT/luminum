# Email: How It Works and Where Things Live

## Where is the send-email UI?

- **Inbox and list:** Dashboard → **`/[slug]/emails`** (e.g. `/my-org/emails`). This page lists inbound and outbound emails for the organization and shows email setup (domain, MX, verify).
- **Send API:** The API exposes **`POST /api/emails/send`** (see `apps/api/src/routes/emails.ts`). It expects `organizationId`, `to`, `subject`, and `text` or `html`. **There is currently no compose or reply UI in the dashboard** — the Reply/Forward buttons on the email detail page are disabled. To send from the app you would need to add a compose form or reply flow that calls this API.

## How email works in this repo (self-hosted)

### Outbound (sending)

1. A client (future UI or another service) calls **`POST /api/emails/send`**.
2. The API resolves the org’s reply address, then calls **`sendViaMailApp()`** in `apps/api/src/lib/email-send.ts`.
3. **`sendViaMailApp()`** does an **HTTP POST to `MAIL_APP_URL/send`** (with optional `MAIL_APP_SECRET`). In production, **`MAIL_APP_URL`** points to the in-repo mail service (e.g. `http://mail:8025`).
4. The **apps/mail** Go service receives the request, resolves the recipient’s MX, and delivers the message via SMTP to the recipient’s mail server.

So: **sending is handled by the in-repo mail app** at `MAIL_APP_URL` (no external mail provider required).

### Inbound (receiving)

1. The **apps/mail** Go service listens on **port 25 (SMTP)** on the host that runs the mail container. It accepts incoming mail for your domain(s).
2. For each received message, **apps/mail** parses the MIME (from, to, subject, text, html, attachments), builds a JSON payload, signs it with **`WEBHOOK_SECRET`**, and **POSTs to `API_URL/api/webhook/emails`** with headers `x-webhook-timestamp` and `x-webhook-signature`.
3. The API verifies the signature, looks up the organization by the recipient address (domain → website → organization), creates an `Email` record, uploads any attachments (base64 from the webhook) to S3, and can send in-app notifications.

So: **inbound mail is received by apps/mail on port 25** and forwarded to the API via the webhook. No Cloudflare Email Routing or other external receiver is required.

## DNS for email

To receive and send mail for your domain (e.g. `luminum.agency` or a subdomain), configure DNS as follows. The server that runs the **mail** container must have **port 25** open for inbound SMTP (many cloud providers block port 25 by default; you may need to request it or use a relay).

### MX (receiving)

- Point **MX** for the domain you use for email (e.g. `luminum.agency`) to the host that runs the mail container.
- If the server’s hostname is **mail.luminum.agency**, add an **A** (or AAAA) record for **mail** to your server’s public IP, then set **MX** for **luminum.agency** to **mail.luminum.agency** (priority 10 or similar).

Example:

| Type | Name | Content           | TTL  |
|------|------|-------------------|------|
| A    | mail | YOUR_SERVER_IP    | Auto |
| MX   | @    | mail.luminum.agency | 10   |

### SPF (sending)

- Add a **TXT** record for the domain so recipients accept mail from your server. Example:  
  **Name:** `@` (or the subdomain you send from)  
  **Content:** `v=spf1 a mx ip4:YOUR_SERVER_IP ~all`  
  (Replace `YOUR_SERVER_IP` with your server’s public IP, or use `include:` if you use another SPF provider.)

### DKIM (optional but recommended)

- DKIM signs outgoing mail with a private key; the recipient checks the public key in DNS. To enable it:
  - Generate a DKIM key pair and store the private key where **apps/mail** can read it (e.g. env or file).
  - Add a **TXT** record for the chosen selector (e.g. **default._domainkey**) with the public key.  
  Implementation of DKIM signing in the Go app can be added in a follow-up; this section documents the DNS side.

## Why didn’t my email arrive?

- **If you “sent” from the app:** Ensure **`MAIL_APP_URL`** is set in the API environment (e.g. `http://mail:8025` in production). The mail service must be running and able to resolve MX and connect to recipient servers (port 25 outbound is usually allowed).
- **If you expected to receive mail in the dashboard:** Inbound mail only appears after:
  - Your domain’s **MX** points to the host that runs the **mail** container, and that host has **port 25** open for inbound SMTP.
  - The **mail** service is running and has **`API_URL`** and **`WEBHOOK_SECRET`** set (same `WEBHOOK_SECRET` as the API).
  - The recipient address’s domain is linked to an organization with email enabled and a matching website/domain in the DB.

## Logging (system logs)

- **Outbound:** When a send via `POST /api/emails/send` succeeds, the API logs **"Email sent (outbound)"** with `to`, `subject`, `messageId`, `emailId`, `organizationId`. The mail service logs when it forwards to the API after receiving mail.
- **Inbound:** When the webhook creates a new inbound email, the API logs **"Email received (inbound)"** with `from`, `to`, `subject`, `emailId`, `organizationId`, and `requestId`.

## Env vars

### API

| Variable | Purpose |
|----------|--------|
| `MAIL_APP_URL` | Base URL of the in-repo mail service (e.g. `http://mail:8025`). Required for sending. |
| `MAIL_APP_SECRET` | Optional secret sent as `X-Mail-Secret` / `Authorization: Bearer` to the mail app. |
| `MAIL_FROM_DEFAULT` | Default From header (e.g. `Luminum <noreply@luminum.agency>`). |
| `MAIL_MX_HOST` | Optional. Override for the MX host the UI shows (e.g. `mail.luminum.agency`). |
| `MAIL_MX_DOMAIN` | Optional. Domain used to resolve MX for setup/verification (e.g. `luminum.agency`). |
| `WEBHOOK_SECRET` | Secret used to verify `x-webhook-signature` on `POST /api/webhook/emails`. Must match the value used by the mail service. |

### Mail service (apps/mail)

| Variable | Purpose |
|----------|--------|
| `API_URL` | Base URL of the API (e.g. `http://api:4000`). Required. |
| `WEBHOOK_SECRET` | Same as API; used to sign inbound webhook payloads. Required. |
| `MAIL_FROM_DEFAULT` | Optional default From when not provided on send. |
| `PORT_HTTP` | HTTP server port for `/send` and `/health` (default 8025). |
| `PORT_SMTP` | SMTP server port for receiving mail (default 25). |
