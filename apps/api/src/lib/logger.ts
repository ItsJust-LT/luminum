/**
 * Application logger.
 * Provides consistent, production-friendly log formatting.
 */

const levelLabel = (level: string) => `[${level}]`;
const timestamp = () => new Date().toISOString();

function formatMessage(level: string, message: string, meta?: Record<string, unknown>) {
  const prefix = `${timestamp()} ${levelLabel(level)}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(formatMessage("INFO", message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(formatMessage("WARN", message, meta));
  },

  error(message: string, meta?: Record<string, unknown>) {
    console.error(formatMessage("ERROR", message, meta));
  },

  /** Use for request-scoped or diagnostic details (avoid in hot paths in production). */
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("DEBUG", message, meta));
    }
  },
};
