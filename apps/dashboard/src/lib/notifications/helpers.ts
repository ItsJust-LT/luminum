import { NotificationType, NotificationData, NotificationTarget } from "@/lib/types/notifications"

export interface SendNotificationParams {
  type: NotificationType
  data: NotificationData
  target: NotificationTarget
  customTitle?: string
  customMessage?: string
}

// Notification helpers are now handled by the Express API.
// These stubs exist for backward compatibility with any remaining dashboard-side imports.
export async function sendNotification(params: SendNotificationParams) {
  console.warn("sendNotification called from dashboard - this should be handled by the API")
  return { success: false, error: "Notifications are handled by the API" }
}

export async function notifyMemberJoined(organizationId: string, memberName: string, memberEmail: string, memberRole: string) {
  return { success: true }
}

export async function notifyMemberLeft(organizationId: string, memberName: string, memberEmail: string) {
  return { success: true }
}

export async function notifyMemberInvited(organizationId: string, invitationEmail: string, invitationRole: string, invitedByName: string) {
  return { success: true }
}

export async function notifyInvitationAccepted(organizationId: string, memberName: string, memberEmail: string) {
  return { success: true }
}

export async function notifyNewUserRegistration(userName: string, userEmail: string) {
  return { success: true }
}

export async function notifyFormSubmission(websiteId: string, formName: string, submissionData: Record<string, any>, formSubmissionId?: string) {
  return { success: true }
}

export async function notifyAdmins(type: NotificationType, data: NotificationData, customTitle?: string, customMessage?: string) {
  return { success: true }
}

export async function notifyAdminsOrganizationCreated(organizationName: string, organizationId: string) {
  return { success: true }
}

export async function notifyAdminsOrganizationDeleted(organizationName: string, organizationId: string) {
  return { success: true }
}

export async function notifySupportTicketCreated(ticketId: string, ticketNumber: string, title: string, category: string, priority: string, userId?: string, organizationId?: string) {
  return { success: true }
}

export async function notifySupportMessage(ticketId: string, ticketNumber: string, title: string, message: string, senderName: string, userId: string, organizationId?: string) {
  return { success: true }
}
