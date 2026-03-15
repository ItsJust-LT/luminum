import { persistLog } from "./log-store.js";

/**
 * Application logger.
 * Logs to console and persists to system_logs (fire-and-forget).
 * Errors are logged with request_id, error_code, and stack for investigation.
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

/** Build meta suitable for investigation: error name, code, stack, and any extra context. */
function errorMeta(err: unknown, extra?: Record<string, unknown>): Record<string, unknown> {
  const meta: Record<string, unknown> = { ...extra };
  if (err instanceof Error) {
    meta.error_name = err.name;
    if (err.message) meta.error_message = err.message;
    if ("code" in err && err.code !== undefined) meta.error_code = String(err.code);
    if (err.stack) meta.stack = err.stack;
  } else if (err !== undefined && err !== null) {
    meta.error_value = String(err);
  }
  return meta;
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

  /**
   * Log an error with full investigation context: request_id, error_code, stack.
   * Use in catch blocks so errors can be found and investigated in System Logs.
   */
  logError(err: unknown, contextMessage: string, extra?: Record<string, unknown>, requestId?: string) {
    const message = err instanceof Error ? err.message : String(err);
    const meta = errorMeta(err, { context: contextMessage, ...extra });
    const fullMessage = `${contextMessage}: ${message}`;
    console.error(formatMessage("ERROR", fullMessage, meta));
    toStore("error", fullMessage, meta, requestId);
  },

  /** Use for request-scoped or diagnostic details (avoid in hot paths in production). */
  debug(message: string, meta?: Record<string, unknown>, requestId?: string) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("DEBUG", message, meta));
    }
    toStore("debug", message, meta, requestId);
  },
};
