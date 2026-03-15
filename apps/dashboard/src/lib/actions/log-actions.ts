"use server"

import { serverPost } from "@/lib/api-server"

export type LogLevel = "info" | "warn" | "error" | "debug"

/**
 * Send a log entry to the API to be stored in system_logs.
 * Call from server actions or server components when you want to persist dashboard-side events/errors.
 */
export async function ingestLog(entry: {
  service?: string
  level?: LogLevel
  message: string
  meta?: Record<string, unknown>
}) {
  try {
    await serverPost("/api/admin/logs/ingest", {
      service: entry.service ?? "dashboard",
      level: entry.level ?? "info",
      message: entry.message,
      meta: entry.meta,
    })
  } catch {
    // avoid breaking the app if ingest fails
  }
}
