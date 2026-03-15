import { prisma } from "./prisma.js";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  service: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown> | null;
  request_id?: string | null;
}

const MAX_MESSAGE_LENGTH = 8000;
const MAX_META_JSON_LENGTH = 15000;

function truncateMessage(msg: string): string {
  if (msg.length <= MAX_MESSAGE_LENGTH) return msg;
  return msg.slice(0, MAX_MESSAGE_LENGTH) + "...[truncated]";
}

function sanitizeMeta(meta: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object") return null;
  try {
    const json = JSON.stringify(meta);
    if (json.length > MAX_META_JSON_LENGTH) {
      return { _truncated: true, _size: json.length, ...meta };
    }
    return meta;
  } catch {
    return { _serializeError: true };
  }
}

/**
 * Persist a log entry to the database. Fire-and-forget; never throws to caller.
 */
export function persistLog(entry: LogEntry): void {
  const message = truncateMessage(entry.message);
  const meta = sanitizeMeta(entry.meta ?? null);
  prisma.system_logs
    .create({
      data: {
        service: entry.service,
        level: entry.level,
        message,
        meta: meta ? (meta as object) : undefined,
        request_id: entry.request_id ?? undefined,
      },
    })
    .catch((err) => {
      try {
        process.stdout.write(`[log-store] failed to persist: ${String(err)}\n`);
      } catch {}
    });
}
