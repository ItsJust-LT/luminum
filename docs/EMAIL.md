# Email: How It Works and Where Things Live

## Where is the send-email UI?

- **Inbox and list:** Dashboard → **`/[slug]/emails`**. Lists inbound/outbound mail and **mail setup** (domain, DNS, SES).
- **Send API:** **`POST /api/emails/send`** and **`POST /api/emails/:id/reply`** (`apps/api/src/routes/emails.ts`). Outbound is **Amazon SES only** (`sendOutboundViaSes` in `apps/api/src/lib/email-send.ts`).

## Outbound (sending)

1. **From / Reply-To** come from **`getOrgReplyAddress`** (address on the org’s selected website domain).
2. **`sendOutboundViaSes`** builds raw MIME and calls **`sendViaSes`** (`@aws-sdk/client-sesv2`) when **`AWS_REGION`** (or **`AWS_DEFAULT_REGION`**) and credentials (or instance role) are set.
3. The domain must be a **verified SES domain identity** with DNS aligned to SES. Optional **`SES_FROM_STRICT=true`** requires Easy DKIM **SUCCESS** before send.
4. Optional **`EMAIL_SEND_SES_ORG_IDS`**: comma-separated org IDs allowed to send; empty = any org that passes SES checks.

**Sandbox:** Until production access is granted in that region, SES only sends to verified identities.

## Inbound (receiving)

**Path:** **Amazon SES email receiving** (MX → SES) → **receipt rule** → **Lambda** → **`POST /api/webhook/ses-lambda-inbound`** on your API.

- Header **`X-Luminum-Ses-Webhook-Secret`** (or Bearer) must match **`SES_LAMBDA_INBOUND_SECRET`**.
- The API parses MIME (**`mailparser`**), **`persistInboundEmailFromPayload`** (`apps/api/src/lib/inbound-email-persist.ts`) stores the row, uploads attachments to **MinIO/S3-compatible** storage, emits **`email_received`**.

**Operator setup:** See **[SES-LAMBDA-INBOUND.md](./SES-LAMBDA-INBOUND.md)** (Lambda deploy, env, IAM, GitHub variables).

**Large messages:** Above SES’s Lambda inline size, add an S3 receipt action and extend the Lambda to **`GetObject`** then POST to the API.

## Multi-organization / multi-domain

- Each org picks **one website domain** for email (`email_domain_id`).
- **`collectInboundEmailDomains`** (`apps/api/src/lib/ses-receipt-rules.ts`) gathers all distinct domains for orgs with mail enabled.
- **`syncSesInboundReceiptRules`** updates **one** receipt rule’s **`Recipients`** list (all those domains) when **`SES_INBOUND_LAMBDA_ARN`** is set. New domains are picked up when an owner/admin uses **Register in SES** / verify flow, and on the **periodic email job** if configured.

Confirm **SES email receiving** exists in your chosen region: [SES inbound endpoints](https://docs.aws.amazon.com/general/latest/gr/ses.html#ses_inbound_endpoints).

## DNS (SES)

| Purpose | Records |
|--------|---------|
| **MX** | Priority **10** → **`inbound-smtp.<AWS_REGION>.amazonaws.com`**. Only this MX for the domain used for mail. |
| **SPF** | TXT at apex: **`v=spf1 include:amazonses.com -all`**. |
| **DKIM** | Easy DKIM **CNAMEs** from SES: `{token}._domainkey.domain` → `{token}.dkim.amazonses.com`. |
| **Domain verification** | TXT at **`_amazonses.<domain>`** (token from SES / **`GetIdentityVerificationAttributes`**); dashboard shows this when pending. |
| **DMARC** | TXT at **`_dmarc.domain`**, **`p=quarantine`** or **`p=reject`**. |

## SES identity and receipt rules

- **`POST /api/emails/ses-register-domain`** (owner/admin): **`CreateEmailIdentity`**, DB sync, **`syncSesInboundReceiptRules`** (if Lambda ARN set).
- Rule set: **`SES_RECEIPT_RULE_SET_NAME`** (default `luminum-ses-inbound`), rule: **`SES_RECEIPT_RULE_NAME`**.

### IAM (API user)

Include at least: `ses:SendEmail`, `ses:SendRawEmail`, `ses:GetEmailIdentity`, `ses:GetIdentityVerificationAttributes`, `ses:CreateEmailIdentity`, receipt-rule APIs (`CreateReceiptRule`, `UpdateReceiptRule`, `DescribeReceiptRuleSet`, `CreateReceiptRuleSet`, `SetActiveReceiptRuleSet`, etc.).

## Live setup and cron

- **`GET /api/emails/setup-status`**: **`GetEmailIdentity`**, **`GetIdentityVerificationAttributes`**, **`GetAccount`**, DNS checks, **`inboundPipeline.sesReceivingConfigured`** (Lambda ARN + secret present).
- **`POST /api/emails/verify-dns`**: persists **`email_dns_verified_at`** when checks pass.
- **`POST /api/cron/verify-email-dns`** (`CRON_SECRET`): batch job for all orgs.
- **`EMAIL_DNS_PERIODIC_CHECK_MS`**: in-process interval; also triggers **receipt rule sync** when Lambda ARN is set.

## Env vars (API)

| Variable | Purpose |
|----------|---------|
| `AWS_REGION` / `AWS_DEFAULT_REGION` | SES + receipt rules |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | API credentials (or use instance role) |
| `SES_CONFIGURATION_SET` | Optional on send |
| `SES_FROM_STRICT` | Require DKIM SUCCESS before send |
| `EMAIL_SEND_SES_ORG_IDS` | Optional outbound org allowlist |
| `SES_LAMBDA_INBOUND_SECRET` | Lambda → API webhook |
| `SES_INBOUND_LAMBDA_ARN` | Lambda for receipt rule |
| `SES_RECEIPT_RULE_SET_NAME` / `SES_RECEIPT_RULE_NAME` | Rule identifiers |
| `EMAIL_DNS_PERIODIC_CHECK_MS` | Periodic DNS + receipt sync |
| `WEBHOOK_SECRET` | Analytics / other HMAC webhooks (not org email) |
| `MAIL_SEND_IP` / `SERVER_IP` | Branded custom-domain A record checks (Admin) |

## Logging

- **Outbound:** `"Email sent (outbound)"` / `"Email sent (reply)"` with SES MessageId.
- **Inbound:** `"Email received (inbound)"` after Lambda webhook ingest.
