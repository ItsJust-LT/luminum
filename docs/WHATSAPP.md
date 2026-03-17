# WhatsApp integration

## Session storage

WhatsApp session is stored in Postgres via **RemoteAuth** (`whatsapp_account.session_data`). There is no long-lived `.wwebjs_auth` folder on the server; the library may write to a temp path only during `extract()`.

## Clear session (force new QR)

If you see repeated "socket hang up" or connection errors:

- **Dashboard:** WhatsApp → Settings → **Clear session data**. Confirm, then click **Reconnect** to get a new QR code.
- **API:** `POST /api/whatsapp/clear-session` with `{ "organizationId": "..." }`. Then call reconnect or open the dashboard to scan a new QR.

This clears `session_data` (and related fields) for that organization so the next connection requires a fresh QR scan.

## Local development

If you run the API locally and have a stray `.wwebjs_auth` (or similar) folder and want a full reset:

1. Stop the API.
2. Delete `node_modules` in the repo root (or in `apps/api` if you install there).
3. Delete any local session folder (e.g. `.wwebjs_auth` in the API working directory).
4. Run `pnpm install` (from repo root).
5. Start the API and connect again. Session will be stored in the database; for a clean QR flow use **Clear session data** in the dashboard (or the clear-session API) then reconnect.
