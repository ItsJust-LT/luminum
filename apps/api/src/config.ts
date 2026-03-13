/**
 * Application configuration.
 * Centralizes environment variables and runtime settings for production consistency.
 */

const env = process.env;
const isProduction = env.NODE_ENV === "production";

export const config = {
  /** Server port (default 4000). */
  port: parseInt(env.PORT ?? "4000", 10),

  /** Public URL of the dashboard (auth callbacks, CORS, links). */
  appUrl: env.APP_URL ?? "http://localhost:3000",

  /** Public URL of this API (e.g. for WebSocket URLs returned to clients). */
  apiWsUrl: env.API_WS_URL ?? env.APP_URL ?? "http://localhost:4000",

  /** Node environment. */
  nodeEnv: env.NODE_ENV ?? "development",

  /** Whether the process is running in production. */
  isProduction,

  /** Request body size limit (bytes). */
  bodyLimit: "50mb",

  /** CORS: allowed origin(s). Comma-separated list or single APP_URL. */
  corsOrigin: env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : (env.APP_URL ?? "http://localhost:3000"),
} as const;

export type AppConfig = typeof config;
