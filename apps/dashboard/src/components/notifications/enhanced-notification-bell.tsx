'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import { isPushEnabled, subscribeToPush, unsubscribeFromPush } from '@/lib/notifications/push-client';
import { api } from '@/lib/api';
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
  if (action.kind === 'api') {
    if (action.id === 'mark_email_read' || action.id === 'mark_form_read') {
      await api.notifications.performAction(n.id, action.id);
      return;
    }
    if (action.path && action.method === 'POST') {
      const path = action.path.startsWith('/') ? action.path : `/${action.path}`;
      await fetch(`/api/proxy${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body ?? {}),
      });
    }
  } else if (action.kind === 'navigate' && action.href) {
    if (action.href.startsWith('/')) {
      window.location.href = action.href;
    } else {
      window.open(action.href, '_blank');
    }
  }
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

  useEffect(() => {
    let mounted = true;
    isPushEnabled()
      .then((enabled) => {
        if (mounted) setPushEnabled(enabled);
      })
      .catch(() => setPushEnabled(false));
    return () => {
      mounted = false;
    };
  }, []);

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

  const onTogglePush = async () => {
    if (!session?.user?.id) return;
    setToggling(true);
    try {
      if (pushEnabled) {
        const ok = await unsubscribeFromPush(session.user.id);
        if (ok) setPushEnabled(false);
      } else {
        const ok = await subscribeToPush(session.user.id);
        if (ok) setPushEnabled(true);
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
              className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-md ring-2 ring-background tabular-nums dark:from-rose-500 dark:to-red-600"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn(
          'w-[min(100vw-1.25rem,26rem)] overflow-hidden rounded-2xl p-0',
          'max-h-[min(85vh,36rem)] border border-border/60 shadow-2xl',
          'bg-popover/95 backdrop-blur-2xl dark:bg-popover/98',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
        )}
      >
        {/* Header */}
        <div className="relative border-b border-border/50 bg-gradient-to-b from-muted/50 to-muted/20 px-4 py-3.5 dark:from-muted/30 dark:to-muted/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Inbox className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">Notifications</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : notifications.length === 0
                        ? 'Nothing new yet'
                        : 'All caught up'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
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

        <ScrollArea className="max-h-[min(65vh,28rem)]">
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
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 ring-1 ring-border/50">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">You&apos;re all set</p>
                <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                  New emails, form submissions, and team updates will show up here.
                </p>
              </motion.div>
            )}

            {sections.length > 0 && (
              <div className="space-y-1 py-2">
                {sections.map((section) => (
                  <div key={section.label}>
                    <div className="sticky top-0 z-[1] px-4 pb-1 pt-2">
                      <span className="inline-flex rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                        {section.label}
                      </span>
                    </div>
                    <ul className="space-y-1 px-2">
                      {section.items.map((n) => {
                        const style = getNotificationTypeStyle(n.type);
                        const accent = style.accentHex;
                        const isUnread = !n.read;
                        const rowActions = (n.actions || []).filter((a) => a.id !== 'open');

                        return (
                          <li key={n.id}>
                            <motion.button
                              type="button"
                              initial={{ opacity: 0.85 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                'group flex w-full gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors',
                                'hover:bg-muted/70 dark:hover:bg-muted/40',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                isUnread &&
                                  'border-border/30 bg-gradient-to-r from-muted/60 to-transparent shadow-sm dark:from-muted/25'
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
                                          'bg-amber-500/12 text-amber-700 dark:text-amber-400'
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
                                    className="mt-2 flex flex-wrap gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {rowActions.map((a) => (
                                      <Button
                                        key={a.id}
                                        type="button"
                                        size="sm"
                                        variant={
                                          a.variant === 'secondary' || a.style === 'secondary'
                                            ? 'outline'
                                            : 'secondary'
                                        }
                                        className="h-7 rounded-lg px-2.5 text-xs"
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

        <DropdownMenuSeparator className="my-0" />

        <div className="flex items-center justify-between gap-3 bg-muted/25 px-4 py-2.5 dark:bg-muted/15">
          <span className="text-[11px] text-muted-foreground">
            Browser push{' '}
            <span
              className={cn(
                'font-semibold',
                pushEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {pushEnabled === null ? '…' : pushEnabled ? 'on' : 'off'}
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => void onTogglePush()}
            disabled={toggling || pushEnabled === null}
          >
            {pushEnabled ? 'Turn off' : 'Turn on'}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
