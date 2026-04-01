'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import { isPushEnabled, subscribeToPush, unsubscribeFromPush } from '@/lib/notifications/push-client';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getNotificationTypeStyle } from '@/lib/notifications/utils';
import { formatRelativeTime } from '@/lib/notifications/utils';
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
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
    if (action.path && action.method === 'POST') {
      await fetch(`${API_URL}${action.path}`, {
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
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    let mounted = true;
    isPushEnabled().then(enabled => {
      if (mounted) setPushEnabled(enabled);
    }).catch(() => setPushEnabled(false));
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    if (unreadCount > prevUnreadCount && prevUnreadCount > 0) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

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

  const bellIcon = hasUnread ? (
    <BellRing className="h-5 w-5 text-primary" />
  ) : (
    <Bell className="h-5 w-5" />
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative transition-all hover:bg-muted/80"
          aria-label={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          {bellIcon}
          {unreadCount > 0 && (
            <motion.div
              initial={false}
              animate={{
                scale: isAnimating ? [1, 1.25, 1] : 1,
              }}
              transition={{
                duration: 0.6,
                ease: "easeOut"
              }}
              className="absolute -top-0.5 -right-0.5 pointer-events-none"
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full text-white font-bold leading-none select-none",
                  "min-h-[0.875rem] min-w-[0.875rem] h-[0.875rem] px-1 text-[9px] tabular-nums",
                  "bg-red-600 dark:bg-red-500 border border-background",
                  "shadow-sm ring-1 ring-red-600/20 dark:ring-red-500/20"
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </motion.div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "w-[96vw] sm:w-[420px] p-0 overflow-hidden",
          "max-h-[85vh] sm:max-h-[600px]",
          "border shadow-2xl bg-background/95 backdrop-blur-xl",
          "dark:bg-background/98 dark:border-border/50"
        )}
      >
        <div className="border-b px-4 py-3.5 flex items-center justify-between bg-muted/30 dark:bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-600 dark:bg-red-500 text-white text-xs font-bold px-2 py-0.5 min-w-[1.5rem] border-0 shadow-sm">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationPreferencesButton />
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllAsRead()}
                className="text-xs h-7 hover:bg-muted"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[calc(85vh-140px)] sm:max-h-[520px]">
          <AnimatePresence mode="popLayout">
            {isLoading && notifications.length === 0 && (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[72%] max-w-[220px]" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center"
              >
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30 dark:text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground font-medium">No notifications</p>
                <p className="text-xs text-muted-foreground/70 mt-1">You&apos;re all caught up!</p>
              </motion.div>
            )}

            {sections.length > 0 && (
              <div className="divide-y divide-border/50">
                {sections.map((section) => (
                  <div key={section.label}>
                    <div className="sticky top-0 z-[1] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 backdrop-blur-sm border-b border-border/40">
                      {section.label}
                    </div>
                    {section.items.map((n, index) => {
                      const style = getNotificationTypeStyle(n.type);
                      const isUnread = !n.read;
                      const rowActions = (n.actions || []).filter(
                        (a) => a.id !== 'open'
                      );

                      return (
                        <motion.div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.03 }}
                          className={cn(
                            "w-full text-left px-4 py-3.5 hover:bg-muted/60 dark:hover:bg-muted/40 transition-all duration-200",
                            "relative group cursor-pointer",
                            isUnread && "bg-muted/30 dark:bg-muted/20 border-l-4",
                            isUnread && style.borderColor
                          )}
                          onClick={() => void onRowActivate(n)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void onRowActivate(n);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.03 + 0.08, type: "spring" }}
                              className={cn(
                                "flex-shrink-0 mt-0.5 h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
                                style.badgeColor,
                                style.badgeTextColor,
                                "ring-2 ring-background/50 dark:ring-background/30"
                              )}
                            >
                              {getNotificationIconForBadge(n.type, 'h-5 w-5', n.iconKey)}
                            </motion.div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={cn(
                                      "text-sm font-semibold truncate",
                                      isUnread ? style.color : "text-foreground/80 dark:text-foreground/70"
                                    )}>
                                      {n.title}
                                    </p>
                                    {isUnread && (
                                      <span className="h-2 w-2 rounded-full flex-shrink-0 bg-red-500 shadow-sm" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                                    {n.message}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {n.data?.priority && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0 h-4 font-medium",
                                          n.data.priority === 'high' && "border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20",
                                          n.data.priority === 'urgent' && "border-red-300 text-red-700 dark:border-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                                        )}
                                      >
                                        {n.data.priority}
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatRelativeTime(n.timestamp)}
                                    </span>
                                  </div>
                                  {rowActions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                                      {rowActions.map((a) => (
                                        <Button
                                          key={a.id}
                                          type="button"
                                          size="sm"
                                          variant={a.variant === 'secondary' || a.style === 'secondary' ? 'outline' : 'default'}
                                          className="h-7 text-xs"
                                          onClick={() => void runRowAction(n, a)}
                                        >
                                          {a.label}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {isUnread && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ delay: index * 0.03 + 0.15, duration: 0.3 }}
                              className="absolute bottom-0 left-0 h-0.5 bg-primary/60 dark:bg-primary/40"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {hasMore && notifications.length > 0 && (
            <div className="p-3 border-t border-border/50 bg-muted/20 dark:bg-muted/10">
              <Button
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                variant="ghost"
                className="w-full text-xs h-8 hover:bg-muted/60"
              >
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="px-4 py-3 bg-muted/20 dark:bg-muted/10 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Push: {pushEnabled ? (
                <span className="text-green-600 dark:text-green-400 font-medium">On</span>
              ) : (
                <span className="text-muted-foreground">Off</span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePush}
              disabled={toggling || pushEnabled === null}
              className="text-xs h-7 hover:bg-muted/60"
            >
              {pushEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
