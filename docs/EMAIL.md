# Email: How It Works and Where Things Live

## Where is the send-email UI?

- **Inbox and list:** Dashboard → **`/[slug]/emails`**. This page lists inbound and outbound emails and shows email setup (domain, DNS, SES).
- **Send API:** **`POST /api/emails/send`** and **`POST /api/emails/:id/reply`** (`apps/api/src/routes/emails.ts`). Outbound delivery is **Amazon SES only** (`sendOutboundViaSes` in `apps/api/src/lib/email-send.ts`).

## Outbound (sending)

1. The API resolves From / Reply-To with **`getOrgReplyAddress`** (address on the org’s chosen website domain).
2. **`sendOutboundViaSes`** builds raw MIME and calls **`sendViaSes`** (`@aws-sdk/client-sesv2`) when **`AWS_REGION`** (or **`AWS_DEFAULT_REGION`**) and credentials (or instance role) are present.
3. The org’s domain must be a **verified SES domain identity** with DNS aligned to SES (see below). Optional **`SES_FROM_STRICT=true`** requires Easy DKIM status **SUCCESS** before send.
4. Optional **`EMAIL_SEND_SES_ORG_IDS`**: comma-separated org IDs allowed to send; empty means any org that passes SES checks.

Database columns **`outbound_provider`**, **`fallback_used`**, **`fallback_reason`**, **`provider_message_id`** remain for history; new sends use **`ses`** and **`fallback_used: false`**.

## Inbound (receiving)

**Primary path (production):** **Amazon SES email receiving** → receipt rule **Lambda** action → your **Lambda** forwards raw MIME → **`POST /api/webhook/ses-lambda-inbound`** on the API (header **`X-Luminum-Ses-Webhook-Secret`** must match **`SES_LAMBDA_INBOUND_SECRET`**). The API parses MIME (**`mailparser`**), then **`persistInboundEmailFromPayload`** (`apps/api/src/lib/inbound-email-persist.ts`) creates the email row, uploads attachments to **MinIO/S3-compatible storage** (same as before), and emits **`email_received`** notifications.

**Legacy path:** The in-repo **apps/mail** service can still **`POST /api/webhook/emails`** with HMAC signing (**`WEBHOOK_SECRET`**). The same persistence helper is used.

Canonical attachment storage is **your MinIO (or R2) bucket** configured for the API — not AWS S3 as system of record. For messages larger than SES’s Lambda inline limit, add a **temporary** S3 receipt action and extend the Lambda to **`GetObject`** then POST to the API (optional).

## DNS (default: SES)

Default **`EMAIL_INBOUND_MODE=ses`** (or unset):

| Purpose | Records |
|--------|---------|
| **MX (receiving)** | Point to **`inbound-smtp.<AWS_REGION>.amazonaws.com`** (priority 10 per [SES receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-mx-record.html)). |
| **SPF (sending)** | TXT at apex: include SES, e.g. **`v=spf1 include:amazonses.com -all`**. |
| **DKIM** | **Easy DKIM** CNAMEs from SES (**`GetEmailIdentity` / console**): `{token}._domainkey.domain` → `{token}.dkim.amazonses.com`. |
| **Domain verification** | SES-assigned TXT (or DNS-based verification) for the domain identity. |
| **DMARC** | TXT at **`_dmarc.domain`** with **`p=quarantine`** or **`p=reject`** (not `p=none`). |

**Self-hosted inbound** (legacy): set **`EMAIL_INBOUND_MODE=self_hosted`**. MX/SPF/DKIM then follow **`mail.<domain>`**, **`MAIL_SEND_IP`**, and **`MAIL_DKIM_SELECTOR`** as before.

## SES identity and receipt rules

- **`POST /api/emails/ses-register-domain`** (owner/admin): **`CreateEmailIdentity`** for the org’s email domain, syncs DB SES status, and runs **`syncSesInboundReceiptRules`** (when **`SES_INBOUND_LAMBDA_ARN`** is set).
- Receipt rule set name: **`SES_RECEIPT_RULE_SET_NAME`** (default `luminum-ses-inbound`), rule name: **`SES_RECEIPT_RULE_NAME`**. The API aggregates all org email domains into one rule’s **Recipients** list with a **Lambda** + **Stop** action.
- Deploy the Lambda from **`infra/ses-lambda-inbound/index.mjs`**; set **`LUMINUM_API_URL`** and **`LUMINUM_SES_WEBHOOK_SECRET`** (match **`SES_LAMBDA_INBOUND_SECRET`** on the API). Grant SES permission to invoke the function on the rule.

### IAM sketch (API / operator)

- **API:** `ses:SendEmail`, `ses:SendRawEmail`, `ses:GetEmailIdentity`, `ses:CreateEmailIdentity`, `ses:CreateReceiptRule`, `ses:UpdateReceiptRule`, `ses:DescribeReceiptRuleSet`, `ses:CreateReceiptRuleSet`, `ses:SetActiveReceiptRuleSet`, etc.
- **Lambda:** CloudWatch Logs; egress HTTPS to **`LUMINUM_API_URL`**; **`s3:GetObject`** only if you use a staging bucket for large mail.

## Live setup and cron

- **`GET /api/emails/setup-status`**: on each load, live **`GetEmailIdentity`**, **`GetAccount`** (sandbox hint), and DNS checks (MX/SPF/DMARC/SES DKIM CNAMEs). Returns **`liveChecks`**, **`ses`**, **`sesAccount`**.
- **`POST /api/emails/verify-dns`**: same checks, updates **`email_dns_verified_at`** / errors.
- **`POST /api/cron/verify-email-dns`** ( **`CRON_SECRET`** ): same verification job for all orgs.
- **`EMAIL_DNS_PERIODIC_CHECK_MS`**: if set to a positive interval (e.g. `21600000` for 6h), the API process runs that job on a **`setInterval`** after listen (no GitHub Actions schedule for email DNS).

## Env vars (API)

| Variable | Purpose |
|----------|---------|
| `AWS_REGION` / `AWS_DEFAULT_REGION` | SES + receipt rules region |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Optional if using instance role |
| `SES_CONFIGURATION_SET` | Optional SES configuration set on send |
| `SES_FROM_STRICT` | If `true`, require DKIM **SUCCESS** before send |
| `EMAIL_SEND_SES_ORG_IDS` | Optional outbound allowlist of org IDs |
| `EMAIL_INBOUND_MODE` | `ses` (default) or `self_hosted` |
| `SES_LAMBDA_INBOUND_SECRET` | Shared secret for Lambda → API webhook |
| `SES_INBOUND_LAMBDA_ARN` | Lambda ARN for receipt rule sync |
| `SES_RECEIPT_RULE_SET_NAME` / `SES_RECEIPT_RULE_NAME` | Receipt rule identifiers |
| `EMAIL_DNS_PERIODIC_CHECK_MS` | In-process DNS re-check interval; omit/`0` to disable |
| `WEBHOOK_SECRET` | HMAC secret for **`/api/webhook/emails`** (legacy mail app) |

Mail-app vars (**`MAIL_APP_URL`**, etc.) are optional and **not** used for org outbound send.

## Logging

- **Outbound:** `"Email sent (outbound)"` / `"Email sent (reply)"` with `providerMessageId` (SES MessageId).
- **Inbound:** `"Email received (inbound)"` after webhook or SES Lambda ingest.
