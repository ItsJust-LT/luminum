# Ably setup and usage in this project

This project uses Ably for (1) **dashboard realtime** (messages on `organization:*` and `user:*`) and (2) **analytics time-on-site** (presence on `analytics:*` + webhook). The code follows Ably’s token auth and capability model; the steps below are what **you** need to do in the Ably dashboard and env.

---

## 1. API key and capabilities (required)

- **Where:** Ably Dashboard → your app → API Keys → use an existing key or create one.
- **Env:** Set `NEXT_PRIVATE_ABLY_API_KEY` to the full key (e.g. `keyId:secret`). Never expose this in the browser.

The key must be allowed to:

- **Issue tokens** (default for API keys).
- **Dashboard:** Publish and subscribe on the channels your server and tokens use. Easiest: give the key capability `*` (all operations on all channels). Tighter: at least:
  - `organization:*` → `["publish","subscribe"]`
  - `user:*` → `["publish","subscribe"]`
- **Analytics:** So the app can issue tokens that only have presence on `analytics:websiteId`, the key must allow presence on those channels. Easiest: `analytics:*` → `["presence"]` (or `*`).

If the key is too restrictive, token requests from `/api/ably/token` or `/api/analytics/ably-token` can fail or tokens may not work for the intended channel.

---

## 2. Presence webhook for time-on-site (required for duration)

Without this, presence leave events never reach your app and `events.duration` will stay `NULL`.

1. Ably Dashboard → your app → **Integrations** (or **Webhooks**).
2. Add a **Generic HTTP** webhook.
3. Set:
   - **URL:** `https://<your-app-host>/api/webhook/ably` (e.g. `https://app.luminum.agency/api/webhook/ably`).
   - **Event type:** **Presence** (or “Presence Integration” / `channel.presence`).
   - **Channel filter:** `^analytics:.*` (only analytics presence channels).
4. **Request mode:** Single or Batch – the app supports both (batched `items[]` and enveloped single `source`/`channel`/`presence`).
5. **Enveloped:** Left on (default) – the handler expects the standard enveloped/batched format.

Optional: enable **Sign with key** and use the same API key’s secret to verify `X-Ably-Signature` in your webhook (e.g. HMAC-SHA256 of raw body, base64, compare to header). The app does not verify the signature by default.

---

## 3. What the code does (no action needed)

- **Token auth:** All client access uses tokens from your backend (`/api/ably/token` for dashboard, `/api/analytics/ably-token` for tracker). API key is only used server-side.
- **Dashboard:** Server uses `Ably.Rest`/Realtime with the API key only on the server to publish; browser uses `authUrl: "/api/ably/token"` and subscribes with scoped capabilities (`user:*` subscribe, `organization:*` subscribe).
- **Analytics:** Tracker script uses `authCallback` that fetches a token from `/api/analytics/ably-token` (with `websiteId` and `sessionId`); token has `clientId = sessionId` and capability `analytics:${websiteId}` → `["presence"]` only. Presence is decoded with `PresenceMessage.fromEncodedArray` per Ably’s webhook docs.
- **Token TTL:** Analytics tokens use 55 minutes; dashboard tokens use default. Both are within Ably’s limits and work with automatic refresh via `authUrl`/`authCallback`.

---

## 4. Checklist

- [ ] `NEXT_PRIVATE_ABLY_API_KEY` set in env (and in Ably dashboard the key has the capabilities above).
- [ ] Generic HTTP webhook created: **Presence**, channel filter `^analytics:.*`, URL `https://<your-domain>/api/webhook/ably`.
- [ ] (Optional) Webhook “Sign with key” enabled and verification implemented if you want to reject forged requests.

After that, dashboard realtime and analytics time-on-site (including duration updates on leave) will work as implemented.
