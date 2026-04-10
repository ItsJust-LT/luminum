'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellRing, BellOff, Inbox, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import {
  isPushEnabled,
  isPushSupported,
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/notifications/push-client';
import { useSession } from '@/lib/auth/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getNotificationTypeStyle, formatRelativeTime } from '@/lib/notifications/utils';
import { cn } from '@/lib/utils';
import { NotificationPreferencesButton } from './notification-preferences-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotificationIconForBadge } from '@/components/notifications/notification-icons';
import { Skeleton } from '@/components/ui/skeleton';
import type { Notification, NotificationAction } from '@/lib/notifications/types';
import {
  getVisibleNotificationActions,
  isMarkResourceReadActionId,
} from '@/lib/notifications/action-visibility';
import { runNotificationAction } from '@/lib/notifications/run-notification-action';
import { toast } from 'sonner';

function defaultOpenHref(n: Notification): string | undefined {
  const actions = n.actions || [];
  const primary = actions.find(
    (a) =>
      (a.variant === 'primary' || a.style === 'primary') &&
      a.kind === 'navigate' &&
      a.href
  );
  return primary?.href || n.data?.url;
}

async function runRowAction(n: Notification, action: NotificationAction) {
  await runNotificationAction(n, action);
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupNotifications(items: Notification[]) {
  const now = new Date();
  const t0 = startOfLocalDay(now);
  const t1 = t0 - 86400000;
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];
  for (const n of items) {
    if (n.timestamp >= t0) today.push(n);
    else if (n.timestamp >= t1) yesterday.push(n);
    else earlier.push(n);
  }
  const sections: { label: string; items: Notification[] }[] = [];
  if (today.length) sections.push({ label: 'Today', items: today });
  if (yesterday.length) sections.push({ label: 'Yesterday', items: yesterday });
  if (earlier.length) sections.push({ label: 'Earlier', items: earlier });
  return sections;
}

export function EnhancedNotificationBell() {
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushSupported, setPushSupported] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const {
    notifications,
    unreadCount,
    hasUnread,
    isLoading,
    isLoadingMore,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
  } = useNotifications();
  const { data: session } = useSession();
  const [justBumped, setJustBumped] = useState(false);
  const prevUnreadRef = useRef(0);

  const refreshPushState = useCallback(async () => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (!supported) {
      setPushEnabled(false);
      setPushPermission(null);
      return;
    }
    try {
      const [enabled, permission] = await Promise.all([isPushEnabled(), getPushPermissionState()]);
      setPushEnabled(enabled);
      setPushPermission(permission);
    } catch {
      setPushEnabled(false);
      setPushPermission(null);
    }
  }, []);

  useEffect(() => {
    void refreshPushState();
  }, [refreshPushState]);

  useEffect(() => {
    if (open) {
      setPushError(null);
      void refreshPushState();
    }
  }, [open, refreshPushState]);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && unreadCount > 0) {
      setJustBumped(true);
      const t = setTimeout(() => setJustBumped(false), 650);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const sections = useMemo(() => groupNotifications(notifications), [notifications]);

  const onSubscribePush = async () => {
    if (!session?.user?.id) {
      toast.error('Sign in to enable browser notifications.');
      return;
    }
    if (!pushSupported) {
      toast.error('Push notifications are not supported in this browser.');
      return;
    }
    const perm = await getPushPermissionState();
    setPushPermission(perm);
    if (perm === 'denied') {
      toast.error('Notifications are blocked for this site. Enable them in your browser settings, then try again.');
      return;
    }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setPushError('Push is not configured for this environment.');
      toast.error('Push notifications are not configured on this deployment.');
      return;
    }
    setPushError(null);
    setToggling(true);
    try {
      const ok = await subscribeToPush(session.user.id);
      await refreshPushState();
      if (ok) {
        toast.success('You will receive browser notifications for important updates.');
      } else {
        setPushError('Could not subscribe. Check notification permission and try again.');
        toast.error('Could not enable push notifications.');
      }
    } finally {
      setToggling(false);
    }
  };

  const onUnsubscribePush = async () => {
    if (!session?.user?.id) return;
    setPushError(null);
    setToggling(true);
    try {
      const ok = await unsubscribeFromPush(session.user.id);
      await refreshPushState();
      if (ok) {
        toast.success('Browser notifications are turned off for this device.');
      } else {
        setPushError('Could not unsubscribe from push on this device.');
        toast.error('Could not disable push notifications. Try again.');
      }
    } finally {
      setToggling(false);
    }
  };

  const onRowActivate = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id);
    const href = defaultOpenHref(n);
    if (href) {
      if (href.startsWith('/')) {
        window.location.href = href;
      } else {
        window.open(href, '_blank');
      }
    }
  };

  const pushStatusLabel =
    !pushSupported
      ? 'Unavailable'
      : pushEnabled
        ? 'Subscribed'
        : pushPermission === 'denied'
          ? 'Blocked'
          : 'Off';

  return (
    <DropdownMenu modal open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-10 w-10 shrink-0 rounded-full transition-all duration-200',
            'hover:bg-muted/80 active:scale-[0.97]',
            hasUnread &&
              'bg-primary/[0.07] text-primary ring-1 ring-primary/20 hover:bg-primary/[0.11] dark:ring-primary/25',
            !hasUnread && 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          {hasUnread ? (
            <BellRing className={cn('h-[1.35rem] w-[1.35rem]', justBumped && 'animate-pulse')} />
          ) : (
            <Bell className="h-[1.35rem] w-[1.35rem]" />
          )}
          {unreadCount > 0 && (
            <motion.span
              initial={false}
              animate={{ scale: justBumped ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-destructive text-destructive-foreground ring-background absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none shadow-md ring-2 tabular-nums"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          'z-[100] flex max-h-[min(90dvh,var(--radix-dropdown-menu-content-available-height))] w-[min(calc(100vw-1rem),28rem)] flex-col overflow-hidden p-0',
          'rounded-2xl border border-border/60 shadow-2xl',
          'bg-popover',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
        )}
      >
        {/* Header — stays above the scroll region */}
        <div className="relative shrink-0 border-b border-border/60 bg-card px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Inbox className="h-[1.05rem] w-[1.05rem]" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Notifications</h2>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : notifications.length === 0
                      ? 'Nothing new yet'
                      : 'All caught up'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:pt-0.5 sm:justify-start">
              <NotificationPreferencesButton />
              {notifications.length > 0 && unreadCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs font-medium shadow-none"
                  onClick={() => void markAllAsRead()}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-[min(58dvh,26rem)] max-h-[min(58dvh,26rem)] min-h-[11rem] w-full sm:h-[min(52dvh,24rem)] sm:max-h-[min(52dvh,24rem)] sm:min-h-[12rem]">
          <AnimatePresence initial={false}>
            {isLoading && notifications.length === 0 && (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-border/40 bg-card/30 p-3">
                    <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-[70%]" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center px-6 py-14 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/80 ring-1 ring-border/50">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">You&apos;re all set</p>
                <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                  New emails, form submissions, and team updates will show up here.
                </p>
              </motion.div>
            )}

            {sections.length > 0 && (
              <div className="space-y-0.5 py-2">
                {sections.map((section) => (
                  <div key={section.label}>
                    <div className="sticky top-0 z-10 border-b border-transparent bg-popover/95 px-3 pb-1.5 pt-2 backdrop-blur-sm supports-[backdrop-filter]:bg-popover/80 sm:px-4">
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.label}
                      </span>
                    </div>
                    <ul className="space-y-1 px-2 pb-1">
                      {section.items.map((n) => {
                        const style = getNotificationTypeStyle(n.type);
                        const accent = style.accentHex;
                        const isUnread = !n.read;
                        const rowActions = getVisibleNotificationActions(n, { includeOpen: false });

                        return (
                          <li key={n.id}>
                            <motion.button
                              type="button"
                              initial={{ opacity: 0.85 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                'group flex w-full gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                isUnread
                                  ? 'border-border/25 bg-primary/[0.04] shadow-sm hover:bg-primary/[0.07] dark:bg-primary/[0.06] dark:hover:bg-primary/[0.09]'
                                  : 'hover:bg-muted/60 dark:hover:bg-muted/35'
                              )}
                              style={
                                isUnread
                                  ? { borderLeftWidth: 3, borderLeftColor: accent, borderLeftStyle: 'solid' }
                                  : undefined
                              }
                              onClick={() => void onRowActivate(n)}
                            >
                              <div
                                className={cn(
                                  'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
                                  style.badgeColor,
                                  style.badgeTextColor
                                )}
                              >
                                {getNotificationIconForBadge(n.type, 'h-5 w-5', n.iconKey)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={cn(
                                      'line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight',
                                      isUnread ? 'text-foreground' : 'text-foreground/80'
                                    )}
                                  >
                                    {n.title}
                                  </p>
                                  {isUnread && (
                                    <span
                                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-sm"
                                      title="Unread"
                                    />
                                  )}
                                </div>
                                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {n.message}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {n.data?.priority && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'h-5 border-0 px-2 text-[10px] font-semibold',
                                        n.data.priority === 'urgent' &&
                                          'bg-destructive/12 text-destructive',
                                        n.data.priority === 'high' &&
                                          'bg-secondary/80 text-secondary-foreground'
                                      )}
                                    >
                                      {n.data.priority}
                                    </Badge>
                                  )}
                                  <span className="text-[11px] tabular-nums text-muted-foreground">
                                    {formatRelativeTime(n.timestamp)}
                                  </span>
                                </div>
                                {rowActions.length > 0 && (
                                  <div
                                    className="mt-2 flex flex-wrap items-center gap-1 border-t border-border/40 pt-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {rowActions.map((a) => (
                                      <Button
                                        key={a.id}
                                        type="button"
                                        size="sm"
                                        variant={
                                          isMarkResourceReadActionId(a.id)
                                            ? 'ghost'
                                            : a.variant === 'secondary' || a.style === 'secondary'
                                              ? 'outline'
                                              : 'secondary'
                                        }
                                        className={cn(
                                          'h-7 rounded-md px-2.5 text-xs',
                                          isMarkResourceReadActionId(a.id) &&
                                            'text-muted-foreground hover:text-foreground'
                                        )}
                                        onClick={() => void runRowAction(n, a)}
                                      >
                                        {a.label}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {hasMore && notifications.length > 0 && (
            <div className="border-t border-border/40 p-2">
              <Button
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                variant="ghost"
                className="h-9 w-full rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                {isLoadingMore ? 'Loading…' : 'Load older'}
              </Button>
            </div>
          )}
        </ScrollArea>
        </div>

        <DropdownMenuSeparator className="m-0 shrink-0" />

        <div className="bg-muted/20 shrink-0 border-t border-border/40 px-3 py-3 sm:px-4 dark:bg-muted/10">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <div className="mt-0.5 text-muted-foreground">
                {pushEnabled ? (
                  <BellRing className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">Browser push</p>
                <p className="text-[11px] text-muted-foreground">
                  Get alerts on this device when you are not in the app.
                </p>
                {(() => {
                  const msg =
                    pushError ??
                    (!pushSupported ? 'This browser cannot use push notifications.' : null);
                  if (!msg) return null;
                  return (
                    <p className="text-destructive mt-1 flex items-start gap-1 text-[11px]">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{msg}</span>
                    </p>
                  );
                })()}
                {pushPermission === 'denied' && pushSupported && !pushEnabled && (
                  <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
                    Notifications are blocked for this site. Allow them in your browser site settings, then try
                    Subscribe again.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'rounded-md px-2 py-0.5 text-[10px] font-medium',
                  pushEnabled && 'border-primary/25 bg-primary/15 text-primary',
                  pushPermission === 'denied' && pushSupported && 'border-destructive/30 bg-destructive/10 text-destructive'
                )}
              >
                {pushEnabled === null ? '…' : pushStatusLabel}
              </Badge>
              {pushEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg px-3 text-xs"
                  onClick={() => void onUnsubscribePush()}
                  disabled={toggling || !pushSupported}
                >
                  {toggling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BellOff className="h-3.5 w-3.5" />
                  )}
                  Unsubscribe
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg px-3 text-xs"
                  onClick={() => void onSubscribePush()}
                  disabled={toggling || pushEnabled === null || !pushSupported || pushPermission === 'denied'}
                >
                  {toggling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  Subscribe
                </Button>
              )}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
