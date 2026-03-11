'use client';

import React from 'react';
import {
  Bell,
  Mail,
  FileText,
  UserPlus,
  Users,
  Send,
  MessageSquare,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Building2,
  UserCog,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email_received: Mail,
  form_submission: FileText,
  member_joined: UserPlus,
  member_left: Users,
  member_invited: Send,
  member_role_changed: UserCog,
  invitation_accepted: CheckCircle2,
  invitation_cancelled: AlertCircle,
  new_support_ticket: Ticket,
  support_message: MessageSquare,
  support_ticket_updated: AlertCircle,
  support_ticket_resolved: CheckCircle2,
  new_user_registered: UserPlus,
  organization_created: Building2,
  organization_deleted: Building2,
  system_announcement: Megaphone,
  maintenance_notice: Wrench,
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
};

export function getNotificationIcon(type: string, className?: string): React.ReactNode {
  const Icon = NOTIFICATION_ICONS[type] ?? Bell;
  const colorClass = NOTIFICATION_ICON_COLORS[type] ?? 'text-muted-foreground';
  return <Icon className={cn('h-4 w-4', colorClass, className)} />;
}

export function getNotificationIconForBadge(type: string, className?: string): React.ReactNode {
  const Icon = NOTIFICATION_ICONS[type] ?? Bell;
  const colorClass = NOTIFICATION_ICON_COLORS[type] ?? 'text-muted-foreground';
  return <Icon className={cn('h-5 w-5', colorClass, className)} />;
}
