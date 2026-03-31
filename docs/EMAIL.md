# Email (organization inbox and send)

- **Inbox and list:** Dashboard → **`/[slug]/emails`**. Lists inbound and outbound mail and **mail setup** (domain, Resend, DNS hints).
- **Send API:** **`POST /api/emails/send`** and **`POST /api/emails/:id/reply`** (`apps/api/src/routes/emails.ts`). Outbound uses **each organization’s Resend project** (`sendOutboundViaResend` in `apps/api/src/lib/email-send.ts`).
- **Platform / auth email:** System messages (invites, password reset, etc.) use the global **`RESEND_API_KEY`** on the API and dashboard — separate from per-tenant mail.

## Per-organization Resend

1. Each org selects an **email domain** tied to a **website** domain (`POST /api/emails/setup-domain`).
2. In **their** [Resend](https://resend.com) project they add that domain, enable **sending** and **receiving**, and publish the **MX / SPF / DKIM** records Resend shows.
3. A **platform administrator** saves the org’s **API key** and **webhook signing secret** via **`PATCH /api/admin/organizations/:id/resend`** (optional: update key or secret independently; encrypted at rest when **`LUMINUM_EMAIL_SECRETS_KEY`** is set on the API). Tenant **`PUT /api/organization-settings/resend-email`** is disabled (403).
4. In Resend → **Webhooks**, add URL **`{API_URL}/api/webhook/resend-inbound`** and subscribe to **`email.received`**, using the same signing secret stored in Luminum.

Status and hints: **`GET /api/emails/setup-status`**. Re-validation: **`POST /api/emails/verify-dns`** (calls Resend’s domain APIs with the stored key plus optional SPF/DMARC DNS checks).

## Inbound path

**Resend** → **`POST /api/webhook/resend-inbound`** (Svix-signed body) → the API verifies the signature with the org’s webhook secret, fetches full content via Resend **Receiving** APIs, then **`persistInboundEmailFromPayload`** (`apps/api/src/lib/inbound-email-persist.ts`) stores the row and uploads attachments to **S3-compatible** storage. Successful creates broadcast **`email:created`** to the org WebSocket channel.

See [RESEND-INBOUND.md](./RESEND-INBOUND.md) for webhook and operator checklist.

## Environment (API)

| Variable | Role |
|----------|------|
| `EMAIL_SYSTEM_ENABLED` | Set `false` to disable org email features globally. |
| `LUMINUM_EMAIL_SECRETS_KEY` | 64 hex chars; encrypts per-org Resend API key and webhook secret. |
| `RESEND_API_KEY` | Platform-only sends (auth, system); not used for org inbox/send. |
| `EMAIL_DNS_PERIODIC_CHECK_MS` | Optional periodic `verify-email-dns` logic (advisory + Resend state). |

## Historical rows

Older **`email`** rows may show **`outbound_provider`** `ses` or `mail_app`. New outbound uses **`resend`**.
