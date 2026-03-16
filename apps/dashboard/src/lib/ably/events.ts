/**
 * Event type constants (kept for backward compatibility).
 * With Ably removed, these are no longer used for real-time push
 * but some components may still reference them.
 */
export const OrganizationEvents = {
  EMAIL_CREATED: "email:created",
  EMAIL_READ: "email:read",
  EMAIL_DELETED: "email:deleted",
  FORM_SUBMISSION_CREATED: "form:created",
  FORM_SUBMISSION_UPDATED: "form:updated",
  FORM_SUBMISSION_DELETED: "form:deleted",
  WEBSITE_CREATED: "website:created",
  WEBSITE_UPDATED: "website:updated",
  WEBSITE_DELETED: "website:deleted",
  WHATSAPP_MESSAGE: "whatsapp:message",
  WHATSAPP_STATUS: "whatsapp:status",
} as const

export const UserNotificationEvents = {
  NEW_EMAIL: "notification:new_email",
  NEW_FORM_SUBMISSION: "notification:new_form",
  SYSTEM_NOTIFICATION: "notification:system",
} as const
