"use server"

import { serverGet, serverPatch } from "@/lib/api-server"

export interface NotificationPreferencesData {
  push_enabled?: boolean
  in_app_enabled?: boolean
  email_enabled?: boolean
  disabled_types?: string[]
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
}

export async function getNotificationPreferences() {
  return serverGet("/api/notification-preferences")
}

export async function updateNotificationPreferences(data: NotificationPreferencesData) {
  return serverPatch("/api/notification-preferences", data)
}

export async function isNotificationTypeEnabled(userId: string, notificationType: string): Promise<boolean> {
  return true
}

export async function areNotificationsEnabled(userId: string, channel: "push" | "in_app" | "email"): Promise<boolean> {
  return true
}

export async function isQuietHours(userId: string): Promise<boolean> {
  return false
}
