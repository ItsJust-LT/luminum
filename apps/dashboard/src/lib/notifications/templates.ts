import { NotificationTemplate, NotificationType } from "@/lib/types/notifications"

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  // Organization member events
  member_joined: {
    type: "member_joined",
    title: "New Team Member",
    message: "{memberName} joined {organizationName}",
    priority: "normal",
    category: "organization",
    icon: "👥",
    color: "green",
    actionText: "View Team"
  },
  
  member_left: {
    type: "member_left", 
    title: "Member Left",
    message: "{memberName} left {organizationName}",
    priority: "normal",
    category: "organization",
    icon: "👋",
    color: "orange",
    actionText: "View Team"
  },
  
  member_invited: {
    type: "member_invited",
    title: "Invitation Sent",
    message: "Invited {invitationEmail} to join {organizationName} as {invitationRole}",
    priority: "low",
    category: "organization", 
    icon: "📧",
    color: "blue",
    actionText: "View Invitations"
  },
  
  member_role_changed: {
    type: "member_role_changed",
    title: "Role Updated",
    message: "{memberName}'s role in {organizationName} changed from {previousRole} to {memberRole}",
    priority: "normal",
    category: "organization",
    icon: "🔄",
    color: "purple",
    actionText: "View Team"
  },
  
  invitation_accepted: {
    type: "invitation_accepted",
    title: "Invitation Accepted",
    message: "{memberName} accepted the invitation to join {organizationName}",
    priority: "normal",
    category: "organization",
    icon: "✅",
    color: "green",
    actionText: "View Team"
  },
  
  invitation_cancelled: {
    type: "invitation_cancelled",
    title: "Invitation Cancelled",
    message: "Invitation to {invitationEmail} for {organizationName} was cancelled",
    priority: "low",
    category: "organization",
    icon: "❌",
    color: "red",
    actionText: "View Invitations"
  },
  
  // Form submissions
  form_submission: {
    type: "form_submission",
    title: "New Form Submission",
    message: "New submission for {formName} on {websiteName} ({organizationName})",
    priority: "high",
    category: "forms",
    icon: "📝",
    color: "blue",
    actionText: "View Submission"
  },
  
  // Email events (Gmail-style: show sender and subject)
  email_received: {
    type: "email_received",
    title: "New email from {fromName}",
    message: "{subject}",
    priority: "normal",
    category: "organization",
    icon: "📧",
    color: "blue",
    actionText: "Open"
  },
  
  // Admin events
  new_user_registered: {
    type: "new_user_registered",
    title: "New User Registration",
    message: "{newUserName} ({newUserEmail}) registered",
    priority: "normal",
    category: "admin",
    icon: "🆕",
    color: "green",
    actionText: "View User"
  },
  
  organization_created: {
    type: "organization_created",
    title: "New Organization",
    message: "Organization '{organizationName}' was created",
    priority: "normal",
    category: "admin",
    icon: "🏢",
    color: "blue",
    actionText: "View Organization"
  },
  
  organization_deleted: {
    type: "organization_deleted",
    title: "Organization Deleted",
    message: "Organization '{organizationName}' was deleted",
    priority: "high",
    category: "admin",
    icon: "🗑️",
    color: "red",
    actionText: "View Details"
  },
  
  // Support events
  new_support_ticket: {
    type: "new_support_ticket",
    title: "New Support Ticket",
    message: "Ticket #{ticketNumber}: {title} ({priority} priority)",
    priority: "normal",
    category: "support",
    icon: "🎫",
    color: "blue",
    actionText: "View Ticket"
  },
  
  support_message: {
    type: "support_message",
    title: "New Support Message",
    message: "{senderName} replied to ticket #{ticketNumber}: \"{messagePreview}\"",
    priority: "normal",
    category: "support",
    icon: "💬",
    color: "green",
    actionText: "View Message"
  },
  
  support_ticket_updated: {
    type: "support_ticket_updated",
    title: "Support Ticket Updated",
    message: "Ticket #{ticketNumber}: {title} has been updated",
    priority: "normal",
    category: "support",
    icon: "✏️",
    color: "orange",
    actionText: "View Ticket"
  },
  
  support_ticket_resolved: {
    type: "support_ticket_resolved",
    title: "Support Ticket Resolved",
    message: "Ticket #{ticketNumber}: {title} has been resolved",
    priority: "normal",
    category: "support",
    icon: "✅",
    color: "green",
    actionText: "View Ticket"
  },
  
  // System events
  system_announcement: {
    type: "system_announcement",
    title: "System Announcement",
    message: "{message}",
    priority: "normal",
    category: "system",
    icon: "📢",
    color: "blue",
    actionText: "Read More"
  },
  
  maintenance_notice: {
    type: "maintenance_notice",
    title: "Scheduled Maintenance",
    message: "System maintenance from {maintenanceStart} to {maintenanceEnd}",
    priority: "high",
    category: "system",
    icon: "🔧",
    color: "orange",
    actionText: "View Details"
  },

  invoice_created: {
    type: "invoice_created",
    title: "New invoice",
    message: "Invoice {invoiceNumber} for {organizationName}",
    priority: "normal",
    category: "organization",
    icon: "📄",
    iconKey: "FileText",
    color: "blue",
    actionText: "View invoice"
  },

  invoice_paid: {
    type: "invoice_paid",
    title: "Invoice paid",
    message: "Invoice {invoiceNumber} was marked paid",
    priority: "normal",
    category: "organization",
    icon: "✅",
    iconKey: "CircleDollarSign",
    color: "green",
    actionText: "View invoice"
  },

  blog_post_published: {
    type: "blog_post_published",
    title: "Blog post published",
    message: "{blogPostTitle}",
    priority: "low",
    category: "organization",
    icon: "📰",
    iconKey: "Newspaper",
    color: "blue",
    actionText: "View post"
  }
}

export function getNotificationTemplate(type: NotificationType): NotificationTemplate {
  return NOTIFICATION_TEMPLATES[type]
}

export function formatNotificationMessage(template: NotificationTemplate, data: Record<string, any>): string {
  let message = template.message
  
  // Replace placeholders with actual data
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    if (message.includes(placeholder)) {
      message = message.replace(new RegExp(placeholder, 'g'), String(value || ''))
    }
  })
  
  return message
}
