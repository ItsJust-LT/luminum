# WhatsApp integration

## Session storage

WhatsApp session is stored in Postgres via **RemoteAuth** (`whatsapp_account.session_data`). There is no long-lived `.wwebjs_auth` folder on the server; the library may write to a temp path only during `extract()`.

## Clear session (force new QR)

If you see repeated "socket hang up" or connection errors:

- **Docker:** Ensure the API container has enough shared memory. In `docker-compose.prod.yml` the `api` service uses `shm_size: "1gb"`. If you deploy without that compose file, add `--shm-size=1g` to `docker run` or `shm_size` in your stack — default 64MB often breaks Chromium on WhatsApp Web.
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

## Environment (API)

| Variable | Default | Notes |
|----------|---------|--------|
| `WHATSAPP_AUTH_TIMEOUT_MS` | `120000` | Time allowed for auth / initial load |
| `WHATSAPP_PROTOCOL_TIMEOUT_MS` | `300000` | Puppeteer CDP timeout (reduces premature "socket hang up") |
| `WHATSAPP_PUPPETEER_MINIMAL` | (off) | Set `true` to use single-process Chromium (saves RAM; less stable for WA Web) |

---

## What changed that “broke” things (forensics)

Nothing randomly regressed on WhatsApp’s side. A few **first-integration assumptions** started failing under real use and in **Docker**:

| Symptom | Root cause | Fix (commit area) |
|--------|------------|-------------------|
| **500 on send — unique on `(chat_id`, `wa_message_id`)** | Outbound flow used `prisma.whatsapp_message.create()`. The same WhatsApp message id can already exist (inbound echo / reconciliation raced ahead of the API response). | **`upsert`** on send + reconciliation (`e83991a` and follow-ups). Current code has **no** `whatsapp_message.create()` in the API. |
| **Messages from phone not in dashboard** | Mapper set `from_number` from `msg.author` only. In **1:1** chats WhatsApp often leaves `author` empty; the JID is on **`from`**. Rows looked broken or didn’t match expectations. | **`msg.author ?? msg.from`** in mapper (`106391b`). |
| **ENOENT `RemoteAuth-….zip`** | `RemoteAuth` asks us to write the session zip to a path under `.wwebjs_auth/`. In a clean container that **parent directory often didn’t exist**. | **`fs.mkdir(path.dirname(path), { recursive: true })`** before `writeFile` in `PgRemoteAuthStore.extract()` (`106391b`). |
| **“Socket hang up” on init** | Chromium in Docker: tiny default `/dev/shm` + aggressive **single-process** flags unstable for web.whatsapp.com. | **`shm_size: 1gb`** on API container; multi-process Chromium by default; longer protocol timeouts (later commits). |

**If production logs still show `prisma.whatsapp_message.create()`**, that build is **older than the upsert fix** — redeploy the API image so it matches `main`.

**“Last time it worked perfectly”** usually means: light testing (mostly dashboard sends), or session already warm, or not yet hitting duplicate-message races / fresh-container RemoteAuth restore.
