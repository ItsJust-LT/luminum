"use server"

import { serverGet, serverPost, serverDelete } from "@/lib/api-server"

export type NotificationRecord = {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  data: any
  read: boolean
  created_at: string
}

export async function upsertPushSubscription(subscription: any) {
  return serverPost("/api/user-notifications/push-subscription", subscription)
}

export async function removePushSubscription(endpoint: string) {
  return serverDelete("/api/user-notifications/push-subscription", { endpoint })
}

export async function fetchNotifications(cursor?: string, limit: number = 20) {
  return serverGet("/api/user-notifications", { cursor, limit })
}

export async function getUnreadCount() {
  return serverGet("/api/user-notifications/unread-count")
}

export async function markNotificationRead(id: string) {
  return serverPost(`/api/user-notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  return serverPost("/api/user-notifications/read-all")
}

export async function markEmailNotificationsRead(emailId: string) {
  return serverPost("/api/user-notifications/mark-email-read", { emailId })
}

export async function markFormSubmissionNotificationsRead(formSubmissionId: string) {
  return serverPost("/api/user-notifications/mark-form-read", { formSubmissionId })
}

export async function getOrganizationIdBySlug(slug: string): Promise<string | null> {
  const result = await serverGet("/api/user-notifications/org-id-by-slug", { slug })
  return result.organizationId || null
}
