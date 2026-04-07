# How Dashboard, API, and Analytics Connect

This document describes how the **Dashboard** (Next.js), **API** (Express), and **Analytics** (Go) services work together. No features are changed here—only the wiring and flow are described.

---

## 1. Overview

| Service      | Role |
|-------------|------|
| **Dashboard** | Next.js app. Renders UI, runs server actions, and (via rewrites) proxies `/api/*` to the Express API so cookies stay same-origin. |
| **API**       | Express app. Auth (Better Auth), business logic, and **analytics data** (overview, timeseries, realtime, top pages, etc.). Reads/writes the shared DB. |
| **Analytics** | Go app. **Tracking only**: receives page views and form submissions, writes to DB, keeps WebSocket connections for session duration and live viewer count. |

- **Data for the dashboard** (overview, timeseries, realtime, forms list, etc.) comes from the **Express API** (same DB).
- **Tracking** (page views, form submits, session duration) is done by the **Go analytics** service (same DB). Go also knows the **live viewer count** (visitors with an open WebSocket on client sites).
- **Live viewer count** in the dashboard is shown via a **WebSocket to the Express server**. Express does not track visitors itself; it receives live count updates from Go and broadcasts them to dashboard clients. So: **client sites → Go (tracking + live sessions)**; **Go → Express (live-update)**; **dashboard → Express (WebSocket for live count)**.

---

## 2. Dashboard ↔ API (Express)

### 2.1 How requests reach the API

- **Server-side** (Server Components, server actions): use `api-server.ts` (`serverGet`, `serverPost`, etc.). These call `API_URL` (e.g. `http://localhost:4000`) directly and forward the request **cookies** so the API sees the same session.
- **Client-side**: use `@luminum/api-client` with `baseUrl: ""`. The browser sends requests to the same origin (e.g. `https://app.example.com/api/...`). Next.js **rewrites** those to `API_URL` (see `next.config.ts`), so the request is still same-origin and cookies are sent.

So:

- Server: `serverGet("/api/analytics/overview", { websiteId, start, end })` → `GET ${API_URL}/api/analytics/overview?...` with cookies.
- Client: `api.get("/api/me")` → `GET /api/me` (rewritten to Express) with cookies.

### 2.1b Realtime WebSocket (`/ws/realtime`)

- The dashboard opens **`wss://<dashboard-host>/ws/realtime`** (same origin as the app) so the browser sends **Better Auth session cookies** on the upgrade request.
- Connecting directly to **`wss://api.…/ws/realtime`** from a page on **`app.…`** usually **fails**: cookies are not sent cross-host, so Express returns **401** on upgrade and no messages flow.
- **Production (Caddy):** Route **`/ws/*`** on the dashboard vhost to the **Express** upstream (`127.0.0.1:4000`), as in `deploy/caddy/Caddyfile`. Custom-org on-demand vhosts use the same rule.
- **Local dev:** With dashboard and API both on loopback but different ports, the client uses **`ws://localhost:4000/ws/realtime`** (or matching API host/port) so the handshake reaches Express without extra proxying.

### 2.2 Auth

- Better Auth runs on the **Express** app (`/api/auth/*`). The dashboard does **not** implement auth routes; it only rewrites `/api/auth/*` to the API.
- Session is read by the API via `auth.api.getSession({ headers })`. The dashboard gets “current user” by calling `/api/me` (rewritten to Express), which uses the same session.

### 2.3 Analytics data (overview, timeseries, realtime, etc.)

- All analytics **data** endpoints live on the **Express API** under `/api/analytics/`:
  - `GET /api/analytics/overview`
  - `GET /api/analytics/timeseries`
  - `GET /api/analytics/realtime`
  - `GET /api/analytics/top-pages`
  - `GET /api/analytics/countries`
  - `GET /api/analytics/devices`
- The dashboard uses **server actions** in `lib/actions/analytics.ts` that call these via `serverGet(..., { websiteId, start, end, ... })`. So all analytics data is fetched server-side from the API with the user’s cookies.

### 2.4 Forms

- Form list and form actions (mark seen/contacted) go to the **Express API**:
  - `GET /api/forms` (list)
  - `GET /api/forms/:id`
  - `PATCH /api/forms/:id/status`
- The dashboard uses `lib/actions/forms.ts`, which uses `serverGet` / `serverPatch` (same `API_URL` + cookies).

---

## 3. Live viewer count (Dashboard ↔ Express ↔ Go)

### 3.1 Flow

- **Client websites** load the tracking script from the **Go** service (`/script.js?websiteId=...`). The script POSTs page views to Go and opens a WebSocket to **Go** (`/ws?websiteId=...&eventId=...`) for session duration. So **Go** holds the set of live viewer connections per website.
- **Go** pushes the current live count to the **Express** API whenever it changes (viewer connect/disconnect):
  - `POST ${API_URL}/api/analytics/live-update`
  - Body: `{ websiteId, live }`
  - Header: `X-Webhook-Secret` (same as `WEBHOOK_SECRET`).
- **Express** keeps an in-memory map of the latest count per `websiteId` and runs a **WebSocket server** at `/ws/analytics-live`. Dashboard clients do **not** connect to Go; they connect to **Express** with a short-lived token.
- **Dashboard** (browser):
  1. Fetches a token: `GET /api/analytics/live-ws-token?websiteId=...` (rewritten to Express, with cookies). Express checks the user is in the website’s organization and returns `{ token, url }` where `url` is the Express WebSocket URL (e.g. `ws://localhost:4000/ws/analytics-live`).
  2. Opens a WebSocket to `${url}?websiteId=...&token=...`. Express validates the token and subscribes the client to that `websiteId`, then sends the current count and forwards any new counts when Go calls `live-update`.

So the organization’s dashboard sees realtime users on their client website via **Express WebSocket**; the data is sourced from **Go**, which is the only service that talks to the client site’s visitors.

---

## 4. Dashboard ↔ Analytics (Go) – tracking only

### 4.1 Tracking script and form script (client sites)

- **Third-party sites** (your customers’ websites) that want to send analytics and forms to you do **not** talk to the dashboard or the Express API for tracking. They talk only to the **Go analytics** service:
  - **Page views**: embed script from `<ANALYTICS_URL>/script.js?websiteId=...`. That script POSTs to `<ANALYTICS_URL>/track` and opens a WebSocket to `<ANALYTICS_URL>/ws?websiteId=...&eventId=...` for session duration.
  - **Forms**: embed script from `<ANALYTICS_URL>/form-script.js?websiteId=...`. That script POSTs to `<ANALYTICS_URL>/form`.
- So all **ingestion** (events, form submissions, duration) is done by the Go service and written to the **shared database**. The dashboard never serves the tracking script; it only shows data that the API reads from that DB.

### 4.2 Session identity (same visitor across page views and forms)

- Both the tracking script and the form script use the **same first-party cookie** so one visitor is one session across page views and form submissions on a client site.
- **Cookie name**: `__luminum_sid` (set on the client site’s domain when the script runs).
- **Cookie options**: `path=/`, `max-age=31536000` (1 year), `SameSite=Lax`, and `Secure` when the page is loaded over HTTPS.
- **Session ID format**: UUID v4 (e.g. `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`). Both scripts use the same `getOrCreateSid()` logic: read the cookie; if missing or invalid, generate a new UUID, set the cookie, and use that value. So the same browser sends the same `sessionId` in every `/track` and `/form` request body.
- **Backend**: Go normalizes and validates `sessionId` on `/track` and `/form` (trim, allow only `[a-zA-Z0-9_-]`, length 8–64). Invalid or empty values are stored as `NULL` in `events.session_id` and `form_submissions.session_id`. Deduplication of page views only runs when a valid session ID is present.

---

## 5. Analytics (Go) ↔ API (Express)

### 5.1 Shared database

- Both the **Go** service and the **Express** API use the **same** Postgres (same `DATABASE_URL`):
  - Go: writes `events` and `form_submissions`, and updates `events.duration` on WebSocket disconnect.
  - Express: reads the same tables for analytics endpoints and form list/actions.

### 5.2 Form submission notification (webhook)

- When the Go service inserts a new row into `form_submissions`, it notifies the rest of the app by calling the **Express API**:
  - `POST ${API_URL}/api/analytics/form-notify`
  - Body: `{ websiteId, submissionId, formName, formData }`
  - Optional header: `X-Webhook-Secret` (same as `WEBHOOK_SECRET` in the API).
- The API’s `analyticsWebhookRouter` handles this: it does **not** create the submission again (Go already did); it only runs notification logic (e.g. notify org members). So:
  - **Go**: writes to DB and broadcasts to its own dashboard WebSocket clients (if any still connect to Go) and calls **Express** `POST /api/analytics/form-notify`.
- **API**: sends in-app/push notifications for the new submission.

### 5.3 Live viewer count (Go → Express)

- When the live viewer count for a website changes (visitor connects or disconnects on a client site), **Go** calls **Express**:
  - `POST ${API_URL}/api/analytics/live-update`
  - Body: `{ websiteId, live }` (number of current live sessions).
  - Header: `X-Webhook-Secret` (same as `WEBHOOK_SECRET`).
- Express updates an in-memory count for that `websiteId` and broadcasts to any dashboard WebSocket clients subscribed to that website (see §3). So the dashboard always receives live count via **Express**, not directly from Go.

---

## 6. Request flow summary

### 6.1 User opens dashboard analytics page

1. Next.js loads the page; server components / server actions run.
2. Server actions call `serverGet("/api/analytics/overview", ...)`, `serverGet("/api/analytics/realtime", ...)`, etc. → **Express API** (with cookies).
3. Express validates session, resolves website/organization, queries **Postgres** (events, form_submissions), returns JSON.
4. In the browser, `useAnalyticsPresence(websiteId)` fetches a token from **Express** (`GET /api/analytics/live-ws-token?websiteId=...`, rewritten), then opens a **WebSocket to Express** (`/ws/analytics-live?websiteId=...&token=...`). Express sends the current live count and pushes updates when Go calls `live-update`.
5. Form list on the same page comes from `getFormSubmissions(websiteId)` → **Express** `GET /api/forms`.

### 6.2 Visitor on a client site (tracking)

1. Client site loads `<ANALYTICS_URL>/script.js?websiteId=...` (Go).
2. Script POSTs a page view to **Go** `/track`; Go enriches and inserts into `events`, returns `eventId`.
3. Script opens WebSocket to **Go** `/ws?websiteId=...&eventId=...`. On close, Go updates `events.duration`.
4. Go updates the live count and calls **Express** `POST /api/analytics/live-update`; Express broadcasts to dashboard clients.

### 6.3 Visitor submits a form on a client site

1. Client site loads `<ANALYTICS_URL>/form-script.js?websiteId=...` (Go).
2. On submit, script POSTs to **Go** `/form`. Go inserts into `form_submissions`, broadcasts to its dashboard WebSocket clients, and calls **Express** `POST /api/analytics/form-notify` for notifications.

---

## 7. Environment variables (reference)

| Variable | Where | Purpose |
|----------|--------|---------|
| `API_URL` | Dashboard (server) | Base URL of the Express API for server-side requests (`api-server.ts`). |
| `APP_URL` | API | Allowed CORS origin and auth base URL (dashboard URL). |
| `API_WS_URL` | API | Public URL of the Express server (for WebSocket URL returned to the dashboard in `live-ws-token`). Defaults to `http://localhost:4000`. |
| `DATABASE_URL` | API, Analytics | Shared Postgres connection. |
| `WEBHOOK_SECRET` | API, Analytics | Optional secret for `POST /api/analytics/form-notify` and `POST /api/analytics/live-update`. |
| `API_URL` | Analytics (Go) | Used to call `POST /api/analytics/form-notify` and `POST /api/analytics/live-update`. |
| `NEXT_PUBLIC_ANALYTICS_URL` | Dashboard (client) | Base URL of the Go analytics service **only for embedding tracking/form scripts** on client sites. The dashboard’s live viewer count uses the Express WebSocket, not Go. |

---

## 8. Summary

- **Dashboard** talks to **Express API** for all app and analytics **data** (auth, analytics endpoints, forms) and for **live viewer count** (WebSocket to Express with token). It does **not** connect to Go for live count; Go only serves tracking/form scripts to client sites.
- **Express API** serves auth, business logic, analytics read endpoints, and the **analytics live WebSocket** (`/ws/analytics-live`). It receives **form-notify** and **live-update** from Go and broadcasts live count to dashboard clients.
- **Go Analytics** does all **tracking** (events, forms, duration) and holds live viewer connections from client sites; it pushes the live count to Express via `live-update` and calls **form-notify** for new form submissions.

No feature behavior is changed by this document; it only describes how the three pieces are connected and how to keep URLs and env vars consistent.

For how to **use Redis** (caching, rate limiting, sessions, live-count backup, job queues), see **[REDIS.md](./REDIS.md)**.
