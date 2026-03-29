import { prisma } from "../prisma.js";
import type {
  NotificationType,
  NotificationData,
  NotificationTarget,
} from "@luminum/database/types";
import {
  getNotificationTemplate,
  formatNotificationMessage,
} from "./templates.js";
import { auth } from "../../auth/config.js";
import { broadcastToUser } from "../realtime-ws.js";


async function getOrganizationSlug(
  organizationId: string
): Promise<string | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    return org?.slug || null;
  } catch {
    return null;
  }
}

async function getOrganizationName(
  organizationId: string
): Promise<string | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    return org?.name || null;
  } catch {
    return null;
  }
}

async function getAdminUserIds(): Promise<string[]> {
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    return adminUsers.map((u) => u.id);
  } catch {
    return [];
  }
}

export interface SendNotificationParams {
  type: NotificationType;
  data: NotificationData;
  target: NotificationTarget;
  customTitle?: string;
  customMessage?: string;
}

export async function sendNotification({
  type,
  data,
  target,
  customTitle,
  customMessage,
}: SendNotificationParams) {
  try {
    const template = getNotificationTemplate(type);
    let userIds: string[] = [];

    if (target.userIds) {
      userIds = target.userIds;
    } else if (target.targetAdmins) {
      userIds = await getAdminUserIds();
      if (userIds.length === 0) return { success: true, notifications: [] };
    } else if (target.organizationId) {
      const where: any = { organizationId: target.organizationId };
      if (target.roles && target.roles.length > 0) {
        where.role = { in: target.roles };
      }
      const members = await prisma.member.findMany({
        where,
        select: { userId: true },
      });
      userIds = members.map((m) => m.userId);
    } else if (target.websiteId) {
      const website = await prisma.websites.findUnique({
        where: { id: target.websiteId },
        select: { organization_id: true },
      });
      if (!website) return { success: false, error: "Invalid website_id" };
      const members = await prisma.member.findMany({
        where: { organizationId: website.organization_id },
        select: { userId: true },
      });
      userIds = members.map((m) => m.userId);
    }

    if (target.excludeUserIds && target.excludeUserIds.length > 0) {
      userIds = userIds.filter(
        (id) => !target.excludeUserIds!.includes(id)
      );
    }

    if (userIds.length === 0) {
      return { success: false, error: "No target users found" };
    }

    let enrichedData = { ...data };
    if (data.organizationId && !data.organizationName) {
      const orgName = await getOrganizationName(data.organizationId);
      if (orgName) enrichedData.organizationName = orgName;
    }

    const defaultUrl = await getDefaultUrl(type, enrichedData);
    const title =
      customTitle ||
      formatNotificationMessage(
        { ...template, message: template.title },
        enrichedData
      );
    const message =
      customMessage || formatNotificationMessage(template, enrichedData);

    const inserted = await prisma.notifications.createManyAndReturn({
      data: userIds.map((userId) => ({
        user_id: userId,
        type,
        title,
        message,
        data: {
          ...enrichedData,
          url: enrichedData.url || defaultUrl,
          priority: template.priority,
          category: template.category,
          icon: template.icon,
          color: template.color,
          actionText: template.actionText,
        },
        read: false,
      })),
    });

    if (inserted && inserted.length > 0) {
      await sendPushNotifications(inserted);

      for (const notif of inserted) {
        if (notif.user_id) {
          broadcastToUser(notif.user_id, { type: "notification", data: notif });
        }
      }
    }

    return { success: true, notifications: inserted };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: "Internal server error" };
  }
}

const DEFAULT_ICON = "https://luminum.agency/logo.png";

async function getOrgBranding(
  orgId: string | undefined,
): Promise<{ name: string; logo: string | null; iconUrl: string } | null> {
  if (!orgId) return null;
  try {
    const { config } = await import("../../config.js");
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, logo: true, branded_dashboard_enabled: true },
    });
    if (!org?.branded_dashboard_enabled) return null;
    const apiBase = config.apiUrl.replace(/\/$/, "");
    const fallbackIcon = `${apiBase}/api/public/org-brand?name=${encodeURIComponent(org.name)}`;
    const logo = org.logo?.trim() || null;
    return {
      name: org.name,
      logo,
      iconUrl: logo || fallbackIcon,
    };
  } catch {
    return null;
  }
}

async function sendPushNotifications(notifications: any[]) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return;
  }
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    "mailto:notifications@luminum.agency",
    vapidPublicKey,
    vapidPrivateKey
  );

  for (const notif of notifications) {
    const userId = notif.user_id;
    const subs = await prisma.device_subscriptions.findMany({
      where: { user_id: userId },
      select: { id: true, subscription: true },
    });

    const branding = await getOrgBranding(notif.data?.organizationId);
    const icon = branding?.iconUrl || DEFAULT_ICON;

    for (const sub of subs) {
      try {
        const subscription =
          typeof sub.subscription === "string"
            ? JSON.parse(sub.subscription)
            : sub.subscription;
        const payload = JSON.stringify({
          title: notif.title,
          message: notif.message,
          type: notif.type,
          data: notif.data || {},
          url: notif.data?.url || "/dashboard",
          icon,
          badge: icon,
          organizationName: branding?.name || undefined,
          tag: notif.id,
          timestamp: Date.now(),
        });
        await webpush.sendNotification(subscription, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.device_subscriptions.delete({
            where: { id: sub.id },
          });
        }
      }
    }
  }
}

async function getDefaultUrl(
  type: NotificationType,
  data: NotificationData
): Promise<string> {
  switch (type) {
    case "member_joined":
    case "member_left":
    case "member_role_changed":
    case "invitation_accepted":
    case "member_invited":
    case "invitation_cancelled": {
      if (data.organizationId) {
        const slug = await getOrganizationSlug(data.organizationId);
        return slug ? `/${slug}/team` : "/dashboard";
      }
      return "/dashboard";
    }
    case "form_submission": {
      if (data.organizationId && data.formSubmissionId) {
        const slug = await getOrganizationSlug(data.organizationId);
        return slug
          ? `/${slug}/forms/${data.formSubmissionId}`
          : "/dashboard";
      }
      if (data.organizationId) {
        const slug = await getOrganizationSlug(data.organizationId);
        return slug ? `/${slug}/forms` : "/dashboard";
      }
      return "/dashboard";
    }
    case "email_received": {
      if (data.organizationId && data.emailId) {
        const slug = await getOrganizationSlug(data.organizationId);
        return slug
          ? `/${slug}/emails/${data.emailId}`
          : "/dashboard";
      }
      if (data.organizationId) {
        const slug = await getOrganizationSlug(data.organizationId);
        return slug ? `/${slug}/emails` : "/dashboard";
      }
      return "/dashboard";
    }
    case "new_user_registered":
      return "/admin/users";
    case "organization_created":
    case "organization_deleted":
      return "/admin/organizations";
    case "new_support_ticket":
      return data.url || `/admin/support/${data.ticketId || ""}`;
    case "support_message":
      return data.url || `/support/${data.ticketId || ""}`;
    case "support_ticket_updated":
    case "support_ticket_resolved":
      return data.url || `/support/${data.ticketId || ""}`;
    default:
      return "/dashboard";
  }
}

export async function notifyMemberJoined(
  organizationId: string,
  memberName: string,
  memberEmail: string,
  memberRole: string
) {
  const orgName = await getOrganizationName(organizationId);
  const slug = await getOrganizationSlug(organizationId);
  return sendNotification({
    type: "member_joined",
    data: {
      organizationId,
      organizationName: orgName || undefined,
      memberName,
      memberEmail,
      memberRole,
      url: slug ? `/${slug}/team` : undefined,
    },
    target: { organizationId, excludeUserIds: [] },
  });
}

export async function notifyMemberLeft(
  organizationId: string,
  memberName: string,
  memberEmail: string
) {
  const orgName = await getOrganizationName(organizationId);
  const slug = await getOrganizationSlug(organizationId);
  return sendNotification({
    type: "member_left",
    data: {
      organizationId,
      organizationName: orgName || undefined,
      memberName,
      memberEmail,
      url: slug ? `/${slug}/team` : undefined,
    },
    target: { organizationId },
  });
}

export async function notifyMemberInvited(
  organizationId: string,
  invitationEmail: string,
  invitationRole: string,
  invitedByName: string
) {
  const orgName = await getOrganizationName(organizationId);
  const slug = await getOrganizationSlug(organizationId);
  return sendNotification({
    type: "member_invited",
    data: {
      organizationId,
      organizationName: orgName || undefined,
      invitationEmail,
      invitationRole,
      invitedByName,
      url: slug ? `/${slug}/team` : undefined,
    },
    target: { organizationId, roles: ["admin", "owner"] },
  });
}

export async function notifyInvitationAccepted(
  organizationId: string,
  memberName: string,
  memberEmail: string
) {
  const orgName = await getOrganizationName(organizationId);
  const slug = await getOrganizationSlug(organizationId);
  return sendNotification({
    type: "invitation_accepted",
    data: {
      organizationId,
      organizationName: orgName || undefined,
      memberName,
      memberEmail,
      url: slug ? `/${slug}/team` : undefined,
    },
    target: { organizationId, roles: ["admin", "owner"] },
  });
}

export async function notifyNewUserRegistration(
  userName: string,
  userEmail: string
) {
  return sendNotification({
    type: "new_user_registered",
    data: { newUserName: userName, newUserEmail: userEmail, url: "/dashboard/users" },
    target: { targetAdmins: true },
  });
}

export async function notifyFormSubmission(
  websiteId: string,
  formName: string,
  submissionData: Record<string, any>,
  formSubmissionId?: string
) {
  const website = await prisma.websites.findUnique({
    where: { id: websiteId },
    select: { organization_id: true, name: true },
  });
  if (!website) return { success: false, error: "Website not found" };

  let finalSubmissionId = formSubmissionId;
  if (!finalSubmissionId) {
    const submission = await prisma.form_submissions.create({
      data: {
        website_id: websiteId,
        data: submissionData,
        seen: false,
        contacted: false,
      },
    });
    finalSubmissionId = submission.id;

  }

  const orgName = await getOrganizationName(website.organization_id);
  const slug = await getOrganizationSlug(website.organization_id);

  return sendNotification({
    type: "form_submission",
    data: {
      websiteId,
      websiteName: website.name ?? undefined,
      organizationId: website.organization_id,
      organizationName: orgName ?? undefined,
      formName,
      formSubmissionId: finalSubmissionId,
      submissionData,
      url:
        finalSubmissionId && slug
          ? `/${slug}/forms/${finalSubmissionId}`
          : slug
          ? `/${slug}/forms`
          : undefined,
    },
    target: { organizationId: website.organization_id },
  });
}

export async function notifyAdmins(
  type: NotificationType,
  data: NotificationData,
  customTitle?: string,
  customMessage?: string
) {
  return sendNotification({
    type,
    data,
    target: { targetAdmins: true },
    customTitle,
    customMessage,
  });
}

export async function notifyAdminsOrganizationCreated(
  organizationName: string,
  organizationId: string
) {
  return notifyAdmins("organization_created", {
    organizationId,
    organizationName,
    url: "/dashboard/organizations",
  });
}

export async function notifyAdminsOrganizationDeleted(
  organizationName: string,
  organizationId: string
) {
  return notifyAdmins("organization_deleted", {
    organizationId,
    organizationName,
    url: "/dashboard/organizations",
  });
}

export async function notifySupportTicketCreated(
  ticketId: string,
  ticketNumber: string,
  title: string,
  category: string,
  priority: string
) {
  return sendNotification({
    type: "new_support_ticket",
    data: { ticketId, ticketNumber, title, category, priority, url: `/admin/support/${ticketId}` },
    target: { targetAdmins: true },
  });
}

export async function notifySupportMessage(
  ticketId: string,
  ticketNumber: string,
  title: string,
  message: string,
  senderName: string,
  userId: string,
  organizationId?: string
) {
  const messagePreview =
    message.length > 100 ? message.substring(0, 100) + "..." : message;
  let url = `/support/${ticketId}`;
  if (organizationId) {
    const slug = await getOrganizationSlug(organizationId);
    url = slug ? `/${slug}/support/${ticketId}` : `/support/${ticketId}`;
  }
  return sendNotification({
    type: "support_message",
    data: {
      ticketId,
      ticketNumber,
      title,
      message,
      messagePreview,
      senderName,
      url,
    },
    target: { userIds: [userId] },
  });
}

export async function notifySupportTicketResolved(
  ticketId: string,
  ticketNumber: string,
  title: string,
  userId: string,
  organizationId?: string
) {
  let url = `/support/${ticketId}`;
  if (organizationId) {
    const slug = await getOrganizationSlug(organizationId);
    url = slug ? `/${slug}/support/${ticketId}` : `/support/${ticketId}`;
  }
  return sendNotification({
    type: "support_ticket_resolved",
    data: { ticketId, ticketNumber, title, url },
    target: { userIds: [userId] },
  });
}

export async function notifySupportTicketUpdated(
  ticketId: string,
  ticketNumber: string,
  title: string,
  userId: string,
  organizationId?: string
) {
  let url = `/support/${ticketId}`;
  if (organizationId) {
    const slug = await getOrganizationSlug(organizationId);
    url = slug ? `/${slug}/support/${ticketId}` : `/support/${ticketId}`;
  }
  return sendNotification({
    type: "support_ticket_updated",
    data: { ticketId, ticketNumber, title, url },
    target: { userIds: [userId] },
  });
}
