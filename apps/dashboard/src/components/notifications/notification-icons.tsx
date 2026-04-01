'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email_received: LucideIcons.Mail,
  form_submission: LucideIcons.FileText,
  member_joined: LucideIcons.UserPlus,
  member_left: LucideIcons.Users,
  member_invited: LucideIcons.Send,
  member_role_changed: LucideIcons.UserCog,
  invitation_accepted: LucideIcons.CheckCircle2,
  invitation_cancelled: LucideIcons.AlertCircle,
  new_support_ticket: LucideIcons.Ticket,
  support_message: LucideIcons.MessageSquare,
  support_ticket_updated: LucideIcons.AlertCircle,
  support_ticket_resolved: LucideIcons.CheckCircle2,
  new_user_registered: LucideIcons.UserPlus,
  organization_created: LucideIcons.Building2,
  organization_deleted: LucideIcons.Building2,
  system_announcement: LucideIcons.Megaphone,
  maintenance_notice: LucideIcons.Wrench,
  invoice_created: LucideIcons.FileText,
  invoice_paid: LucideIcons.CircleDollarSign,
  blog_post_published: LucideIcons.Newspaper,
};

const NOTIFICATION_ICON_COLORS: Record<string, string> = {
  email_received: 'text-blue-600 dark:text-blue-400',
  form_submission: 'text-emerald-600 dark:text-emerald-400',
  member_joined: 'text-green-600 dark:text-green-400',
  member_left: 'text-amber-600 dark:text-amber-400',
  member_invited: 'text-blue-600 dark:text-blue-400',
  member_role_changed: 'text-violet-600 dark:text-violet-400',
  invitation_accepted: 'text-green-600 dark:text-green-400',
  invitation_cancelled: 'text-red-600 dark:text-red-400',
  new_support_ticket: 'text-orange-600 dark:text-orange-400',
  support_message: 'text-sky-600 dark:text-sky-400',
  support_ticket_updated: 'text-amber-600 dark:text-amber-400',
  support_ticket_resolved: 'text-green-600 dark:text-green-400',
  new_user_registered: 'text-green-600 dark:text-green-400',
  organization_created: 'text-blue-600 dark:text-blue-400',
  organization_deleted: 'text-red-600 dark:text-red-400',
  system_announcement: 'text-slate-600 dark:text-slate-400',
  maintenance_notice: 'text-amber-600 dark:text-amber-400',
  invoice_created: 'text-blue-600 dark:text-blue-400',
  invoice_paid: 'text-green-600 dark:text-green-400',
  blog_post_published: 'text-indigo-600 dark:text-indigo-400',
};

function resolveIcon(
  type: string,
  iconKey?: string
): React.ComponentType<{ className?: string }> {
  if (iconKey) {
    const Cmp = (LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ className?: string }>
    >)[iconKey];
    if (Cmp) return Cmp;
  }
  return NOTIFICATION_ICONS[type] ?? LucideIcons.Bell;
}

export function getNotificationIcon(
  type: string,
  className?: string,
  iconKey?: string
): React.ReactNode {
  const Icon = resolveIcon(type, iconKey);
  const colorClass =
    NOTIFICATION_ICON_COLORS[type] ?? 'text-muted-foreground';
  return <Icon className={cn('h-4 w-4', colorClass, className)} />;
}

export function getNotificationIconForBadge(
  type: string,
  className?: string,
  iconKey?: string
): React.ReactNode {
  const Icon = resolveIcon(type, iconKey);
  const colorClass =
    NOTIFICATION_ICON_COLORS[type] ?? 'text-muted-foreground';
  return <Icon className={cn('h-5 w-5', colorClass, className)} />;
}
