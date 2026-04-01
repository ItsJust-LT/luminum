import type {
  NotificationActionSpec,
  NotificationData,
  NotificationTemplate,
  NotificationType,
} from "@luminum/database/types";

export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplate
> = {
  member_joined: {
    type: "member_joined",
    title: "New Team Member",
    message: "{memberName} joined {organizationName}",
    priority: "normal",
    category: "organization",
    icon: "👥",
    iconKey: "Users",
    color: "green",
    actionText: "View Team",
  },
  member_left: {
    type: "member_left",
    title: "Member Left",
    message: "{memberName} left {organizationName}",
    priority: "normal",
    category: "organization",
    icon: "👋",
    iconKey: "UserMinus",
    color: "orange",
    actionText: "View Team",
  },
  member_invited: {
    type: "member_invited",
    title: "Invitation Sent",
    message:
      "Invited {invitationEmail} to join {organizationName} as {invitationRole}",
    priority: "low",
    category: "organization",
    icon: "📧",
    iconKey: "Mail",
    color: "blue",
    actionText: "View Invitations",
  },
  member_role_changed: {
    type: "member_role_changed",
    title: "Role Updated",
    message:
      "{memberName}'s role in {organizationName} changed from {previousRole} to {memberRole}",
    priority: "normal",
    category: "organization",
    icon: "🔄",
    iconKey: "RefreshCw",
    color: "purple",
    actionText: "View Team",
  },
  invitation_accepted: {
    type: "invitation_accepted",
    title: "Invitation Accepted",
    message:
      "{memberName} accepted the invitation to join {organizationName}",
    priority: "normal",
    category: "organization",
    icon: "✅",
    iconKey: "CheckCircle",
    color: "green",
    actionText: "View Team",
  },
  invitation_cancelled: {
    type: "invitation_cancelled",
    title: "Invitation Cancelled",
    message:
      "Invitation to {invitationEmail} for {organizationName} was cancelled",
    priority: "low",
    category: "organization",
    icon: "❌",
    iconKey: "XCircle",
    color: "red",
    actionText: "View Invitations",
  },
  form_submission: {
    type: "form_submission",
    title: "New Form Submission",
    message:
      "New submission for {formName} on {websiteName} ({organizationName})",
    priority: "high",
    category: "forms",
    icon: "📝",
    iconKey: "ClipboardList",
    color: "blue",
    actionText: "View Submission",
  },
  email_received: {
    type: "email_received",
    title: "New email from {fromName}",
    message: "{subject}",
    priority: "normal",
    category: "organization",
    icon: "📧",
    iconKey: "Mail",
    color: "blue",
    actionText: "Open",
  },
  new_user_registered: {
    type: "new_user_registered",
    title: "New User Registration",
    message: "{newUserName} ({newUserEmail}) registered",
    priority: "normal",
    category: "admin",
    icon: "🆕",
    iconKey: "UserPlus",
    color: "green",
    actionText: "View User",
  },
  organization_created: {
    type: "organization_created",
    title: "New Organization",
    message: "Organization '{organizationName}' was created",
    priority: "normal",
    category: "admin",
    icon: "🏢",
    iconKey: "Building2",
    color: "blue",
    actionText: "View Organization",
  },
  organization_deleted: {
    type: "organization_deleted",
    title: "Organization Deleted",
    message: "Organization '{organizationName}' was deleted",
    priority: "high",
    category: "admin",
    icon: "🗑️",
    iconKey: "Trash2",
    color: "red",
    actionText: "View Details",
  },
  new_support_ticket: {
    type: "new_support_ticket",
    title: "New Support Ticket",
    message: 'Ticket #{ticketNumber}: {title} ({priority} priority)',
    priority: "normal",
    category: "support",
    icon: "🎫",
    iconKey: "Ticket",
    color: "blue",
    actionText: "View Ticket",
  },
  support_message: {
    type: "support_message",
    title: "New Support Message",
    message:
      '{senderName} replied to ticket #{ticketNumber}: "{messagePreview}"',
    priority: "normal",
    category: "support",
    icon: "💬",
    iconKey: "MessageCircle",
    color: "green",
    actionText: "View Message",
  },
  support_ticket_updated: {
    type: "support_ticket_updated",
    title: "Support Ticket Updated",
    message: "Ticket #{ticketNumber}: {title} has been updated",
    priority: "normal",
    category: "support",
    icon: "✏️",
    iconKey: "Pencil",
    color: "orange",
    actionText: "View Ticket",
  },
  support_ticket_resolved: {
    type: "support_ticket_resolved",
    title: "Support Ticket Resolved",
    message: "Ticket #{ticketNumber}: {title} has been resolved",
    priority: "normal",
    category: "support",
    icon: "✅",
    iconKey: "CheckCircle",
    color: "green",
    actionText: "View Ticket",
  },
  system_announcement: {
    type: "system_announcement",
    title: "System Announcement",
    message: "{message}",
    priority: "normal",
    category: "system",
    icon: "📢",
    iconKey: "Megaphone",
    color: "blue",
    actionText: "Read More",
  },
  maintenance_notice: {
    type: "maintenance_notice",
    title: "Scheduled Maintenance",
    message:
      "System maintenance from {maintenanceStart} to {maintenanceEnd}",
    priority: "high",
    category: "system",
    icon: "🔧",
    iconKey: "Wrench",
    color: "orange",
    actionText: "View Details",
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
    actionText: "View invoice",
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
    actionText: "View invoice",
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
    actionText: "View post",
  },
};

export function getNotificationTemplate(
  type: NotificationType
): NotificationTemplate {
  return NOTIFICATION_TEMPLATES[type];
}

export function formatNotificationMessage(
  template: NotificationTemplate,
  data: Record<string, any>
): string {
  let message = template.message;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    if (message.includes(placeholder)) {
      message = message.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        String(value || "")
      );
    }
  });
  return message;
}

export function buildNotificationActions(
  type: NotificationType,
  template: NotificationTemplate,
  data: NotificationData,
  resolvedUrl: string | undefined
): NotificationActionSpec[] {
  const actions: NotificationActionSpec[] = [];
  if (resolvedUrl) {
    actions.push({
      id: "open",
      label: template.actionText || "Open",
      variant: "primary",
      kind: "navigate",
      href: resolvedUrl,
    });
  }
  if (type === "email_received" && data.emailId) {
    actions.push({
      id: "mark_email_read",
      label: "Mark read",
      variant: "secondary",
      kind: "api",
      method: "POST",
      path: "/api/user-notifications/mark-email-read",
      body: { emailId: data.emailId },
    });
  }
  if (type === "form_submission" && data.formSubmissionId) {
    actions.push({
      id: "mark_form_read",
      label: "Mark read",
      variant: "secondary",
      kind: "api",
      path: "/api/user-notifications/mark-form-read",
      body: { formSubmissionId: data.formSubmissionId },
    });
  }
  return actions;
}
