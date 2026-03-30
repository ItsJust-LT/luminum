# Resend inbound webhook

Org mail is delivered through **each customer’s Resend project** (receiving enabled, MX pointing at Resend).

## Webhook URL

Use your public API base URL:

`https://<api-host>/api/webhook/resend-inbound`

Example: `https://api.example.com/api/webhook/resend-inbound`

## Resend dashboard

1. **Webhooks** → add endpoint with the URL above.  
2. Subscribe to **`email.received`**.  
3. Copy the **signing secret** (Svix) and paste it into Luminum when saving Resend credentials (same value the API uses with `resend.webhooks.verify`).

## Requirements

- Org has an **email domain** set in Luminum (website domain).  
- Org **API key** and **webhook signing secret** saved under organization settings (owner/admin).  
- Recipient addresses must use that domain so Luminum can resolve the org and verify the webhook with the correct secret.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 401 from webhook | Signing secret in Resend matches the value stored for that org; raw body not altered by proxies. |
| 404 unknown recipient | `To` domain matches a website domain for an org with mail enabled. |
| 503 org not configured | API key and webhook secret present; `LUMINUM_EMAIL_SECRETS_KEY` set on the server. |

For full product flow, see [EMAIL.md](./EMAIL.md).
