export type {
  account,
  device_subscriptions,
  events,
  form_submissions,
  images,
  invitation,
  jwks,
  member,
  notifications,
  notification_preferences,
  email,
  email_avatar_cache,
  attachment,
  organization,
  payments,
  session,
  subscriptions,
  support_attachments,
  support_messages,
  support_ticket_participants,
  support_tickets,
  user,
  verification,
  outbox,
  nodes,
  websites,
  whatsapp_account,
} from "@prisma/client";

export { WhatsappAccountStatus } from "@prisma/client";

// Re-export shared domain types

export type NotificationType =
  | "member_joined"
  | "member_left"
  | "member_invited"
  | "member_role_changed"
  | "invitation_accepted"
  | "invitation_cancelled"
  | "form_submission"
  | "email_received"
  | "new_user_registered"
  | "organization_created"
  | "organization_deleted"
  | "new_support_ticket"
  | "support_message"
  | "support_ticket_updated"
  | "support_ticket_resolved"
  | "system_announcement"
  | "maintenance_notice"
  | "invoice_created"
  | "invoice_paid"
  | "blog_post_published";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationCategory =
  | "organization"
  | "forms"
  | "admin"
  | "system"
  | "support";

export type NotificationActionKind = "navigate" | "api";

export interface NotificationActionSpec {
  id: string;
  label: string;
  variant: "primary" | "secondary";
  kind: NotificationActionKind;
  href?: string;
  method?: "POST";
  path?: string;
  body?: Record<string, unknown>;
}

export interface NotificationData {
  url?: string;
  /** Lucide icon name for in-app UI (e.g. "Mail", "Users"). */
  iconKey?: string;
  actions?: NotificationActionSpec[];
  organizationId?: string;
  organizationName?: string;
  websiteId?: string;
  websiteName?: string;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  memberRole?: string;
  previousRole?: string;
  invitationId?: string;
  invitationEmail?: string;
  invitationRole?: string;
  invitedByName?: string;
  formSubmissionId?: string;
  formName?: string;
  submissionData?: Record<string, any>;
  newUserId?: string;
  newUserName?: string;
  newUserEmail?: string;
  announcementId?: string;
  maintenanceStart?: string;
  maintenanceEnd?: string;
  ticketId?: string;
  ticketNumber?: string;
  title?: string;
  category?: string;
  priority?: string;
  message?: string;
  messagePreview?: string;
  senderName?: string;
  emailId?: string;
  fromEmail?: string;
  fromName?: string;
  from?: string;
  toEmail?: string;
  subject?: string;
  fromAvatarUrl?: string;
  /** Invoice / blog (when those features emit events) */
  invoiceId?: string;
  invoiceNumber?: string;
  blogPostId?: string;
  blogPostTitle?: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  /** @deprecated Prefer iconKey in UI; kept for older stored rows. */
  icon: string;
  /** Lucide icon component name (PascalCase). */
  iconKey: string;
  color: string;
  actionText?: string;
}

export interface NotificationTarget {
  userIds?: string[];
  organizationId?: string;
  websiteId?: string;
  roles?: string[];
  excludeUserIds?: string[];
  targetAdmins?: boolean;
}

export interface Website {
  id: string;
  name: string;
  domain: string;
  organization_id: string;
  analytics: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
  website_id?: string;
}

export interface FormSubmission {
  id: string;
  website_id: string;
  submitted_at: string;
  data: Record<string, any>;
  seen: boolean;
  contacted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionFilters {
  seen?: boolean;
  contacted?: boolean;
}

export interface EmailFilters {
  read?: boolean;
  search?: string;
  from?: string;
  emailAddresses?: string[];
  /** inbox | sent | starred | drafts | scheduled */
  mailbox?: string;
}

export interface OrganizationSettings {
  name: string;
  slug: string;
  logo?: string;
  country: string;
  currency: string;
  payment_provider: string;
  billing_email?: string;
  tax_id?: string;
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  metadata?: {
    type?: string;
    industry?: string;
    description?: string;
    website?: string;
    phone?: string;
  };
  max_storage_bytes?: number;
  used_storage_bytes?: number;
  storage_usage_percent?: number;
  storage_warning?: boolean;
  analytics?: boolean;
  emails?: boolean;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status:
    | "open"
    | "in_progress"
    | "waiting_for_user"
    | "resolved"
    | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category:
    | "general"
    | "technical"
    | "billing"
    | "feature_request"
    | "bug_report"
    | "website_issue"
    | "account_issue";
  user_id?: string;
  organization_id?: string;
  assigned_to?: string;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  metadata: Record<string, any>;
  user?: { id: string; name: string; email: string; image?: string };
  organization?: { id: string; name: string; slug: string };
  assigned_user?: { id: string; name: string; email: string; image?: string };
  messages?: SupportMessage[];
  participants?: SupportTicketParticipant[];
  attachments?: SupportAttachment[];
  message_count?: number;
  unread_count?: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  message_type: "text" | "system" | "file";
  attachments: SupportAttachment[];
  is_read: boolean;
  read_at?: string;
  read_by?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role?: string;
  };
}

export interface SupportTicketParticipant {
  id: string;
  ticket_id: string;
  user_id: string;
  role: "creator" | "assignee" | "participant" | "admin";
  joined_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role?: string;
  };
}

export interface SupportAttachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  uploaded_by: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  cloudinary_public_id?: string;
  cloudinary_url?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  provider: string;
  provider_subscription_id?: string;
  provider_customer_id?: string;
  plan_name?: string;
  plan_id?: string;
  status:
    | "active"
    | "trialing"
    | "free"
    | "canceled"
    | "expired"
    | "past_due";
  type: "paid" | "trial" | "free";
  amount?: number;
  currency: string;
  billing_cycle?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface Payment {
  id: string;
  subscription_id: string;
  provider: string;
  provider_payment_id?: string;
  provider_transaction_id?: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "pending" | "refunded";
  payment_method?: string;
  paid_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferencesData {
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  email_enabled?: boolean;
  disabled_types?: string[];
}

export interface AvatarResult {
  imageUrl: string | null;
  bimi: string | null;
  gravatar: string | null;
}

export const OrganizationEvents = {
  EMAIL_CREATED: "email:created",
  EMAIL_READ: "email:read",
  EMAIL_UPDATED: "email:updated",
  EMAIL_DELETED: "email:deleted",
  FORM_SUBMISSION_CREATED: "form:created",
  FORM_SUBMISSION_UPDATED: "form:updated",
  FORM_SUBMISSION_DELETED: "form:deleted",
  WEBSITE_CREATED: "website:created",
  WEBSITE_UPDATED: "website:updated",
  WEBSITE_DELETED: "website:deleted",
  WHATSAPP_MESSAGE: "whatsapp:message",
  WHATSAPP_STATUS: "whatsapp:status",
} as const;

export const UserNotificationEvents = {
  NEW_EMAIL: "notification:new_email",
  NEW_FORM_SUBMISSION: "notification:new_form",
  SYSTEM_NOTIFICATION: "notification:system",
} as const;

export const SUPPORT_CATEGORIES = [
  { id: "general", name: "General Inquiry", icon: "HelpCircle" },
  { id: "technical", name: "Technical Support", icon: "Wrench" },
  { id: "billing", name: "Billing & Payments", icon: "CreditCard" },
  { id: "feature_request", name: "Feature Request", icon: "Lightbulb" },
  { id: "bug_report", name: "Bug Report", icon: "Bug" },
  { id: "website_issue", name: "Website Issues", icon: "Globe" },
  { id: "account_issue", name: "Account Issues", icon: "User" },
] as const;

export const SUPPORT_PRIORITIES = [
  { id: "low", name: "Low", color: "bg-gray-100 text-gray-800" },
  { id: "medium", name: "Medium", color: "bg-blue-100 text-blue-800" },
  { id: "high", name: "High", color: "bg-orange-100 text-orange-800" },
  { id: "urgent", name: "Urgent", color: "bg-red-100 text-red-800" },
] as const;

export const SUPPORT_STATUSES = [
  { id: "open", name: "Open", color: "bg-green-100 text-green-800" },
  { id: "in_progress", name: "In Progress", color: "bg-blue-100 text-blue-800" },
  { id: "waiting_for_user", name: "Waiting for User", color: "bg-yellow-100 text-yellow-800" },
  { id: "resolved", name: "Resolved", color: "bg-purple-100 text-purple-800" },
  { id: "closed", name: "Closed", color: "bg-gray-100 text-gray-800" },
] as const;
