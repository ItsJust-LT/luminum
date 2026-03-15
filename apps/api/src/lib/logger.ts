import { persistLog } from "./log-store.js";

/**
 * Application logger.
 * Logs to console and persists to system_logs (fire-and-forget).
 */
const SERVICE = "api";

const levelLabel = (level: string) => `[${level}]`;
const timestamp = () => new Date().toISOString();

function formatMessage(level: string, message: string, meta?: Record<string, unknown>) {
  const prefix = `${timestamp()} ${levelLabel(level)}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
  }
  return `${prefix} ${message}`;
}

function toStore(level: "info" | "warn" | "error" | "debug", message: string, meta?: Record<string, unknown>, requestId?: string) {
  try {
    persistLog({ service: SERVICE, level, message, meta: meta ?? undefined, request_id: requestId ?? undefined });
  } catch {
    // ignore
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>, requestId?: string) {
    console.log(formatMessage("INFO", message, meta));
    toStore("info", message, meta, requestId);
  },

  warn(message: string, meta?: Record<string, unknown>, requestId?: string) {
    console.warn(formatMessage("WARN", message, meta));
    toStore("warn", message, meta, requestId);
  },

  error(message: string, meta?: Record<string, unknown>, requestId?: string) {
    console.error(formatMessage("ERROR", message, meta));
    toStore("error", message, meta, requestId);
  },

  /** Use for request-scoped or diagnostic details (avoid in hot paths in production). */
  debug(message: string, meta?: Record<string, unknown>, requestId?: string) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("DEBUG", message, meta));
    }
    toStore("debug", message, meta, requestId);
  },
};
