# SES inbound: Lambda → Luminum API

This runbook wires **Amazon SES receiving** so mail to your customers’ domains reaches the Luminum API and appears in **Dashboard → Emails**.

**DNS and SES can be correct, but mail will not reach the app** until you complete this runbook: set **`SES_INBOUND_LAMBDA_ARN`** and **`SES_LAMBDA_INBOUND_SECRET`** on the API (then redeploy/restart), deploy the Lambda with matching **`LUMINUM_SES_WEBHOOK_SECRET`**, and allow SES to invoke the function. The dashboard **Emails** setup page shows a warning when those API variables are missing even if **Verify DNS** passes.

## Prerequisites

1. **Region:** Use an AWS region where **both** [SES sending](https://docs.aws.amazon.com/ses/latest/dg/regions.html) and [SES email receiving](https://docs.aws.amazon.com/general/latest/gr/ses.html#ses_inbound_endpoints) are available. The API’s **`AWS_REGION`** must match.
2. **DNS:** Each mail domain uses MX → `inbound-smtp.<region>.amazonaws.com` (see [EMAIL.md](./EMAIL.md)).
3. **API** reachable at a **public HTTPS** URL (Lambda calls it).

## 1. Create the Lambda

- Code: [`infra/ses-lambda-inbound/index.mjs`](../infra/ses-lambda-inbound/index.mjs).
- Runtime: **Node.js 20.x** (or current LTS you use).
- **Environment variables:**

| Lambda env | Value |
|------------|--------|
| `LUMINUM_API_URL` | `https://api.yourdomain.com` (no trailing slash) |
| `LUMINUM_SES_WEBHOOK_SECRET` | Long random string; **must equal** API **`SES_LAMBDA_INBOUND_SECRET`** |

- **IAM role for Lambda:** `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`; no VPC required unless you restrict egress.
- Note the function **ARN** (e.g. `arn:aws:lambda:us-east-1:123456789012:function:luminum-ses-inbound`).

## 2. Allow SES to invoke the Lambda

In **SES** (same region) → **Email receiving** → **Rule sets**, or use the console when adding the rule action. SES adds a **resource-based policy** on the function allowing `ses.amazonaws.com` to invoke it.

## 3. Configure the Luminum API

Set on the API host (e.g. GitHub Actions–generated `.env`):

| Variable | Purpose |
|----------|---------|
| `AWS_REGION` | Same as SES receive + Lambda |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user/role that can manage identities and receipt rules |
| `SES_INBOUND_LAMBDA_ARN` | Full ARN of the function |
| `SES_LAMBDA_INBOUND_SECRET` | Same value as `LUMINUM_SES_WEBHOOK_SECRET` |
| `SES_RECEIPT_RULE_SET_NAME` | Optional; default `luminum-ses-inbound` |
| `SES_RECEIPT_RULE_NAME` | Optional; default `luminum-forward-to-lambda` |

Redeploy/restart the API after changing these.

## 4. Sync receipt rules

The API aggregates **all** org email domains (mail enabled + domain selected) into **one** rule’s **Recipients** list.

- Triggered when an owner/admin uses **Register in SES** (`POST /api/emails/ses-register-domain`).
- Also runs on the **periodic email job** if **`EMAIL_DNS_PERIODIC_CHECK_MS`** is set and **`SES_INBOUND_LAMBDA_ARN`** is non-empty.

**Activate rule set:** The API calls **`SetActiveReceiptRuleSet`** when syncing (creates/updates the set and rule as needed).

## 5. Verify

1. Complete DNS + SES identity for a test domain (dashboard **Verify DNS**).
2. Send a message **to** an address on that domain.
3. Check API logs and **Emails** inbox; Lambda **CloudWatch** logs on failure.

## Scale and limits

- One rule holds **many** recipient domains; watch [SES quotas](https://docs.aws.amazon.com/ses/latest/dg/quotas.html) and rule complexity.
- **Large messages:** SES may omit raw content in the Lambda event; use an **S3** receipt action and extend the Lambda to fetch the object before POSTing to the API.

## Troubleshooting

| Symptom | Check |
|--------|--------|
| No mail in app | **First:** API has **`SES_INBOUND_LAMBDA_ARN`** + **`SES_LAMBDA_INBOUND_SECRET`** and Lambda is deployed (without these, verified DNS/SES still delivers nowhere into Luminum). Then: MX → correct regional `inbound-smtp`; rule set **active**; domain in rule **Recipients**; Lambda errors in CloudWatch |
| API 401/403 on webhook | `SES_LAMBDA_INBOUND_SECRET` matches Lambda env; header `X-Luminum-Ses-Webhook-Secret` or `Authorization: Bearer …` |
| Receipt sync skipped | `SES_INBOUND_LAMBDA_ARN` empty on API |
| Wrong region | Lambda, SES receive, and API **`AWS_REGION`** must align |
