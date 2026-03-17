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

### SPF (sending, required)

- Add a **TXT** record for the domain so recipients accept mail from your server. Example:  
  **Name:** `@` (or the subdomain you send from)  
  **Content:** `v=spf1 a mx ip4:YOUR_SERVER_IP ~all`  
  (Replace `YOUR_SERVER_IP` with your server’s public IP, or use `include:` if you use another SPF provider.)

### DKIM (required for best deliverability)

- DKIM signs outgoing mail with a private key; the recipient checks the public key in DNS. To enable it:
  - Generate a DKIM key pair and store the private key where **apps/mail** can read it (e.g. env or file).
  - Add a **TXT** record for the chosen selector (e.g. **default._domainkey**) with the public key.  
  Implementation of DKIM signing in the Go app can be added in a follow-up; this section documents the DNS side.

### DMARC (policy, strongly recommended)

- DMARC tells recipients what to do if SPF/DKIM fail and gives you reports about spoofing attempts.
- Add a **TXT** record for `_dmarc` on your domain. Example:  
  **Name:** `_dmarc`  
  **Content:** `v=DMARC1; p=none; rua=mailto:dmarc@YOUR_DOMAIN`  
  You can tighten the policy to `p=quarantine` or `p=reject` once you are confident SPF/DKIM are correct.

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

### API (apps/api)

Set these in the **API** process (e.g. `apps/api/.env` or your deployment env).

| Variable | Required? | Purpose | Where to get it |
|----------|-----------|--------|------------------|
| `MAIL_APP_URL` | **Yes** (for sending) | Base URL of the mail service the API calls for outbound mail. | Your mail service URL. In Docker: `http://mail:8025`. Locally: `http://localhost:8025`. |
| `WEBHOOK_SECRET` | **Yes** (for inbound) | Shared secret to verify `x-webhook-signature` on `POST /api/webhook/emails`. | Generate a random string (e.g. `openssl rand -hex 32`). **Must be the same value** in both API and mail service. |
| `MAIL_APP_SECRET` | Optional | If set, sent as `X-Mail-Secret` and `Authorization: Bearer` when the API calls the mail app’s `/send`. | Generate a random string. Set the same in the mail service if you add auth there. |
| `MAIL_FROM_DEFAULT` | Optional | Default From header when the org doesn’t override (e.g. `Luminum <noreply@luminum.agency>`). | Your chosen default sender; domain is also used for DNS hints if MX/DKIM vars are unset. |
| `MAIL_MX_HOST` | Optional | Exact MX hostname the dashboard shows (e.g. `mail.luminum.agency`). Skips DNS lookup. | Your mail server’s public hostname (same as the A record for the host receiving mail on port 25). |
| `MAIL_MX_DOMAIN` | Optional | Domain used to resolve MX for setup/verification (e.g. `luminum.agency`). | Your email domain. If unset, derived from `MAIL_FROM_DEFAULT`. |
| `MAIL_SEND_HOST` | Optional | Host used in **SPF** suggestion in the dashboard (e.g. `mail.luminum.agency`). | Same as your MX host if you use `include:` in SPF. |
| `MAIL_SEND_IP` | Optional | IP used in **SPF** suggestion (e.g. your server’s public IP). If set, SPF suggestion uses `ip4:...` instead of `include:...`. | Your mail server’s public IPv4. |
| `MAIL_DKIM_SELECTOR` | Optional | DKIM selector for setup instructions (default `default`). Record name becomes `{selector}._domainkey.{domain}`. | Whatever selector you use for DKIM (e.g. `default`). |

### Mail service (apps/mail)

Set these in the **mail** process (e.g. `apps/mail/.env` or your deployment env for the mail container).

| Variable | Required? | Purpose | Where to get it |
|----------|-----------|--------|------------------|
| `API_URL` | **Yes** | Base URL of the API. Mail service POSTs inbound messages to `API_URL/api/webhook/emails`. | Your API base URL. In Docker: `http://api:4000`. Locally: `http://localhost:4000`. |
| `WEBHOOK_SECRET` | **Yes** | Same as API; used to sign inbound webhook payloads. | **Must match** the API’s `WEBHOOK_SECRET` (e.g. `openssl rand -hex 32` once, then set in both). |
| `MAIL_FROM_DEFAULT` | Optional | Default From when a send request doesn’t provide one. | Same as API’s default sender if you want consistency. |
| `PORT_HTTP` | Optional | HTTP port for `/send` and `/health`. Default **8025**. | Only change if 8025 is in use; ensure API’s `MAIL_APP_URL` uses this port. |
| `PORT_SMTP` | Optional | SMTP port for receiving mail. Default **25**. | Host must expose port 25 for internet MX delivery; some providers block 25. |
