/**
 * Application configuration.
 * Centralizes environment variables and runtime settings for production consistency.
 */

const env = process.env;
const isProduction = env.NODE_ENV === "production";

/** Browser Origin header has no trailing slash; env values often mistakenly include one. */
function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/**
 * Allowed CORS origins for the dashboard and other browser clients calling the API.
 * Prefer `CORS_ORIGINS` (comma-separated). Otherwise merge `APP_URL` and `NEXT_PUBLIC_APP_URL`
 * (deploy .env often sets both; empty `APP_URL` alone breaks CORS with `??`).
 */
function buildCorsOrigins(): string[] {
  const raw = env.CORS_ORIGINS?.trim();
  if (raw) {
    return [...new Set(raw.split(",").map((o) => normalizeOrigin(o)).filter(Boolean))];
  }
  const candidates = [env.APP_URL, env.NEXT_PUBLIC_APP_URL].filter(
    (v): v is string => typeof v === "string" && normalizeOrigin(v).length > 0,
  );
  if (candidates.length === 0) {
    return ["http://localhost:3000"];
  }
  return [...new Set(candidates.map(normalizeOrigin))];
}

const appUrlResolved =
  (env.APP_URL && normalizeOrigin(env.APP_URL)) ||
  (env.NEXT_PUBLIC_APP_URL && normalizeOrigin(env.NEXT_PUBLIC_APP_URL)) ||
  "http://localhost:3000";

export const config = {
  /** Server port (default 4000). */
  port: parseInt(env.PORT ?? "4000", 10),

  /** Public URL of the dashboard (auth callbacks, CORS, links). */
  appUrl: appUrlResolved,

  /** Public URL of this API (e.g. for WebSocket URLs returned to clients). */
  apiWsUrl:
    (env.API_WS_URL && normalizeOrigin(env.API_WS_URL)) ||
    (env.API_URL && normalizeOrigin(env.API_URL)) ||
    "http://localhost:4000",

  /** Node environment. */
  nodeEnv: env.NODE_ENV ?? "development",

  /** Whether the process is running in production. */
  isProduction,

  /** Request body size limit (bytes). */
  bodyLimit: "50mb",

  /** CORS: allowed request origin(s) — dashboard URL(s), not the API host. */
  corsOrigin: buildCorsOrigins(),

  /** Public URL of this API (for file proxy links). */
  apiUrl:
    (env.API_URL && normalizeOrigin(env.API_URL)) ||
    (env.API_WS_URL && normalizeOrigin(env.API_WS_URL)) ||
    "http://localhost:4000",
} as const;

export type AppConfig = typeof config;
