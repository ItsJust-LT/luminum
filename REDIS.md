# Using Redis in Luminum

Redis is available in the **API** (and optionally the dashboard for server-side use). The client is in `apps/api/src/lib/redis.ts` but is not yet wired into any flow. This document describes how to **properly utilise and apply** Redis in this project.

---

## 1. Where Redis Fits

| Service     | Use Redis? | Role |
|------------|------------|------|
| **API**    | ✅ Primary | Caching, rate limiting, session store (if configured), live-count backup, job queues. |
| **Dashboard** | Optional | Only if you run server-side code that needs cache (e.g. server actions calling a shared Redis). Prefer using the API as the single place that talks to Redis. |
| **Go Analytics** | Optional | For multi-instance live viewer state or rate limiting; not required for single-instance. |

**Recommendation:** Centralise Redis usage in the **Express API**. Have the API own caching, rate limits, and any shared state (e.g. live count backup). The dashboard and Go only need Redis if they have a direct need (e.g. dashboard server-side cache, or Go horizontal scaling).

---

## 2. Environment

Ensure the API (and any other service that uses Redis) has:

- `REDIS_URL` – e.g. `redis://localhost:6379` or `redis://default:password@host:6379`
- `REDIS_PASSWORD` – if your Redis server requires a password (optional; can be in `REDIS_URL`)

The existing client in `apps/api/src/lib/redis.ts` uses these. If `REDIS_URL` is missing, either skip connecting (and make Redis optional in code) or fail startup so misconfiguration is obvious.

---

## 3. Use Cases and How to Apply Them

### 3.1 Caching expensive reads (API)

**Use for:** Analytics aggregates, dashboard overview, timeseries, or any heavy query that is read often and can be slightly stale.

**How:**

- In the relevant route (e.g. `GET /api/analytics/overview`), after resolving `websiteId` and date range:
  - Build a cache key, e.g. `analytics:overview:${websiteId}:${start}:${end}`.
  - `GET` from Redis. On hit, return the cached JSON.
  - On miss, run the DB query, then `SET` in Redis with a TTL (e.g. 60–300 seconds).
- Use `getRedisClient()` from `lib/redis.ts`; handle "Redis unavailable" by falling back to DB-only (no cache).

**TTL guideline:** 1–5 minutes for realtime-ish data; longer for less time-sensitive aggregates.

### 3.2 Rate limiting (API)

**Use for:** Protecting auth endpoints, webhooks, and public APIs from abuse.

**How:**

- Middleware that runs before sensitive routes (e.g. `/api/auth/*`, `/api/analytics/form-notify`, `/api/webhook/*`).
- Key per client: e.g. `ratelimit:ip:${ip}` or `ratelimit:user:${userId}`.
- Use Redis `INCR` + `EXPIRE` (or a sliding window) to count requests in a time window; reject with 429 when over threshold.
- Optionally use a library (e.g. `rate-limiter-flexible` with Redis store) for consistent behaviour and cleanup.

### 3.3 Session store for Better Auth (API)

**Use for:** Shared sessions across multiple API instances or after restarts; optional if you run a single instance and are fine with in-memory sessions.

**How:**

- Configure Better Auth to use a **Redis session adapter** (if your stack supports it). Check Better Auth docs for "session adapter" or "database adapter" and use the Redis implementation.
- Store session id → session data in Redis with a TTL matching your session lifetime. All API instances then share the same session store.

### 3.4 Live viewer count backup (API)

**Use for:** Persisting the current live count per `websiteId` so it survives API restarts or can be read by another process.

**How:**

- When the API receives `POST /api/analytics/live-update` from Go, in addition to updating the in-memory map:
  - `SET` in Redis, e.g. `live:${websiteId}` = count, with a short TTL (e.g. 60–120 seconds).
- On startup (or when a dashboard client subscribes), if the in-memory count is missing, read from Redis once. That way a single instance gets a reasonable value after restart; TTL avoids stale data if Go stops sending updates.

### 3.5 Job queue for async work (API)

**Use for:** Sending emails, processing notifications, or any work you don't want to do inside the request.

**How:**

- Use a Redis-based queue (e.g. **BullMQ** with Redis). In the API:
  - When an action requires async work (e.g. "send form-notify email"), push a job to a queue instead of doing it in the request.
  - Run one or more workers (same or separate process) that pull jobs from the queue and execute them. Workers use the same Redis and same DB as the API.
- Keeps responses fast and allows retries and monitoring via the queue.

### 3.6 Optional: Dashboard server-side cache

**Use for:** Caching the result of server actions that call the API (e.g. analytics overview) to avoid repeated API calls for the same parameters.

**How:**

- Only if the dashboard has its own Redis client (or calls an API endpoint that uses Redis):
  - In the server action, build a key from `websiteId` and query params, check Redis, return on hit; on miss call the API, then store in Redis with TTL.
- Prefer doing this caching in the **API** and keeping the dashboard stateless; add dashboard-side Redis only if you have a clear need (e.g. different TTL or key strategy).

---

## 4. Implementation Guidelines

1. **Graceful degradation**  
   If Redis is down or not configured, the API should still work: skip cache (always hit DB), skip rate limit (or use in-memory), and skip live-count backup. Log a warning so you know Redis is unavailable.

2. **Keys and TTLs**  
   Use a key prefix (e.g. `luminum:cache:`, `luminum:ratelimit:`) and always set TTL on values so keys don't leak forever.

3. **Connection**  
   Reuse a single Redis connection (or a small pool) per process. The existing `getRedisClient()` singleton is fine; ensure you don't call `connect()` repeatedly on every request.

4. **Security**  
   Don't put secrets or raw PII in Redis unless you encrypt them. Prefer storing IDs and short-lived tokens; keep sensitive data in the database.

---

## 5. Summary

- **Use Redis in the API** for: caching heavy reads, rate limiting, optional session store, live-count backup, and async job queues.
- **Apply it** by wiring these behaviours into the existing Express routes and middleware, using `getRedisClient()` and handling "no Redis" without breaking the app.
- **Optional:** Use Redis in the dashboard only for specific server-side caching needs; prefer doing caching in the API. Use Redis in Go only if you run multiple instances and need shared state (e.g. live viewer count).

Keeping Redis usage in one place (the API) makes it easier to reason about, configure, and operate.
