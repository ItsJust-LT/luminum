import type { Notification, NotificationAction } from "@/lib/notifications/types"

/** API actions that mark an underlying resource (email, form, …) as read — redundant if already read. */
const MARK_RESOURCE_READ_IDS = new Set(["mark_email_read", "mark_form_read"])

export function isMarkResourceReadActionId(id: string): boolean {
  return MARK_RESOURCE_READ_IDS.has(id)
}

function resourceMarkedReadInData(notification: Notification, actionId: string): boolean {
  const d = notification.data as Record<string, unknown> | undefined
  if (!d) return false
  if (actionId === "mark_email_read") {
    return d.emailRead === true || d.emailAlreadyRead === true || d.read === true
  }
  if (actionId === "mark_form_read") {
    return (
      d.formRead === true ||
      d.formAlreadyRead === true ||
      d.formSubmissionRead === true ||
      d.submissionRead === true
    )
  }
  return false
}

/**
 * Actions to show inline (e.g. in the bell menu or toast).
 * Hides `open` when includeOpen is false (primary open is row / toast click).
 * Hides mark-resource-read actions when the notification or payload says it’s already read.
 */
export function getVisibleNotificationActions(
  notification: Notification,
  options?: { includeOpen?: boolean }
): NotificationAction[] {
  const raw = notification.actions ?? []
  const includeOpen = options?.includeOpen ?? false
  return raw.filter((a) => {
    if (a.id === "open" && !includeOpen) return false
    if (isMarkResourceReadActionId(a.id)) {
      if (notification.read) return false
      if (resourceMarkedReadInData(notification, a.id)) return false
    }
    return true
  })
}
