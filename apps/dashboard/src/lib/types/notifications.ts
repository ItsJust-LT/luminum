export type NotificationType = 
  // Organization member events
  | "member_joined"
  | "member_left" 
  | "member_invited"
  | "member_role_changed"
  | "invitation_accepted"
  | "invitation_cancelled"
  // Form submissions
  | "form_submission"
  // Email events
  | "email_received"
  // Admin events
  | "new_user_registered"
  | "organization_created"
  | "organization_deleted"
  // Support events
  | "new_support_ticket"
  | "support_message"
  | "support_ticket_updated"
  | "support_ticket_resolved"
  // System events
  | "system_announcement"
  | "maintenance_notice"

export type NotificationPriority = "low" | "normal" | "high" | "urgent"

export type NotificationCategory = "organization" | "forms" | "admin" | "system" | "support"

export interface NotificationData {
  // Common fields
  url?: string
  organizationId?: string
  organizationName?: string
  websiteId?: string
  websiteName?: string
  
  // Member-specific data
  memberId?: string
  memberName?: string
  memberEmail?: string
  memberRole?: string
  previousRole?: string
  
  // Invitation-specific data
  invitationId?: string
  invitationEmail?: string
  invitationRole?: string
  invitedByName?: string
  
  // Form-specific data
  formSubmissionId?: string
  formName?: string
  submissionData?: Record<string, any>
  
  // Admin-specific data
  newUserId?: string
  newUserName?: string
  newUserEmail?: string
  
  // System-specific data
  announcementId?: string
  maintenanceStart?: string
  maintenanceEnd?: string
  
  // Support-specific data
  ticketId?: string
  ticketNumber?: string
  title?: string
  category?: string
  priority?: string
  message?: string
  messagePreview?: string
  senderName?: string
  
  // Email-specific data
  emailId?: string
  fromEmail?: string
  fromName?: string
  from?: string
  toEmail?: string
  subject?: string
  /** Cached avatar URL for sender (from getAvatarForEmail). Use in notifications to avoid extra lookup. */
  fromAvatarUrl?: string
}

export interface EnhancedNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: NotificationData
  read: boolean
  priority: NotificationPriority
  category: NotificationCategory
  created_at: string
  expires_at?: string
}

export interface NotificationTemplate {
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  category: NotificationCategory
  icon: string
  color: string
  actionText?: string
}

export interface NotificationTarget {
  userIds?: string[]
  organizationId?: string
  websiteId?: string
  roles?: string[] // Target specific roles within organization
  excludeUserIds?: string[] // Exclude specific users
  targetAdmins?: boolean // Target all admin users (user role admins)
}
