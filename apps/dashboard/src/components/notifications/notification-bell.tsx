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
import { cn } from '@/lib/utils';
import { NotificationPreferencesButton } from './notification-preferences-button';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const { unreadCount, hasUnread } = useNotifications();
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Check push notification status
  useEffect(() => {
    let mounted = true;
    isPushEnabled().then(enabled => { 
      if (mounted) setPushEnabled(enabled); 
    }).catch(() => setPushEnabled(false));
    return () => { mounted = false };
  }, []);

  // Load notifications
  useEffect(() => {
    if (!userId) return;
    api.notifications.fetch(undefined, 20).then(({ items: initial, nextCursor }: any) => {
      setNotifications(initial || []);
      setCursor(nextCursor);
    });
  }, [userId]);

  // Reload notifications when dropdown opens
  useEffect(() => {
    if (open && userId) {
      api.notifications.fetch(undefined, 20).then(({ items: initial, nextCursor }: any) => {
        setNotifications(initial || []);
        setCursor(nextCursor);
      });
    }
  }, [open, userId]);

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

  const onMarkAllRead = async () => {
    if (!userId) return;
    await api.notifications.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const onMarkRead = async (id: string) => {
    if (!userId) return;
    await api.notifications.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const loadMore = async () => {
    if (!userId || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items: more, nextCursor } = await api.notifications.fetch(cursor, 20);
      setNotifications(prev => [...prev, ...more]);
      setCursor(nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  // Get the most prominent unread notification for badge color
  const badgeStyle = useMemo(() => {
    if (unreadCount === 0) return null;
    
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return null;
    
    // Get the highest priority unread notification
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const sorted = unreadNotifications.sort((a, b) => {
      const aPriority = priorityOrder[a.data?.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.data?.priority as keyof typeof priorityOrder] || 2;
      return bPriority - aPriority;
    });
    
    const topNotification = sorted[0];
    if (!topNotification) return null;
    
    return getNotificationTypeStyle(topNotification.type);
  }, [notifications, unreadCount]);

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
          className={cn(
            "relative transition-all",
            hasUnread && "animate-pulse"
          )}
          aria-label={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          {bellIcon}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center text-[10px] font-semibold rounded-full shadow-lg",
                badgeStyle && badgeStyle.badgeColor
              )}
              style={badgeStyle ? {
                backgroundColor: badgeStyle.badgeColor.includes('green') ? '#22c55e' :
                                badgeStyle.badgeColor.includes('blue') ? '#3b82f6' :
                                badgeStyle.badgeColor.includes('orange') ? '#f97316' :
                                badgeStyle.badgeColor.includes('red') ? '#ef4444' :
                                badgeStyle.badgeColor.includes('purple') ? '#a855f7' : undefined
              } : undefined}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-[96vw] sm:w-96 p-0 overflow-hidden",
          "max-h-[85vh] sm:max-h-[28rem]",
          "border-2 shadow-xl"
        )}
      >
        <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/40 sticky top-0 z-10">
          <div className="text-sm font-semibold flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationPreferencesButton />
            {notifications.length > 0 && unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onMarkAllRead}
                className="text-xs h-7"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] sm:max-h-[24rem]">
          {notifications.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          )}
          
          {notifications.length > 0 && (
            <div className="divide-y">
              {notifications.map((n) => {
                const style = getNotificationTypeStyle(n.type);
                const isUnread = !n.read;
                
                return (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                      "relative",
                      isUnread && style.bgColor,
                      isUnread && `border-l-4 ${style.borderColor}`
                    )}
                    onClick={() => {
                      if (!n.read) onMarkRead(n.id);
                      // Navigate to notification URL if available
                      if (n.data?.url) {
                        window.location.href = n.data.url;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon/Badge */}
                      <div className={cn(
                        "flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-sm",
                        style.badgeColor,
                        style.badgeTextColor
                      )}>
                        {style.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className={cn(
                                "text-sm font-semibold truncate",
                                isUnread ? style.color : "text-muted-foreground"
                              )}>
                                {n.title}
                              </p>
                              {isUnread && (
                                <span className={cn(
                                  "h-2 w-2 rounded-full flex-shrink-0",
                                  style.badgeColor
                                )} />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {n.data?.priority && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 h-4",
                                    n.data.priority === 'high' && "border-orange-300 text-orange-700",
                                    n.data.priority === 'urgent' && "border-red-300 text-red-700"
                                  )}
                                >
                                  {n.data.priority}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(n.created_at).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {cursor && notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button 
                onClick={loadMore} 
                disabled={loadingMore} 
                variant="ghost" 
                className="w-full text-xs"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
        
        <DropdownMenuSeparator />
        <div className="px-4 py-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Push: {pushEnabled ? (
                <span className="text-green-600 font-medium">On</span>
              ) : (
                <span className="text-muted-foreground">Off</span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePush}
              disabled={toggling || pushEnabled === null}
              className="text-xs h-6"
            >
              {pushEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
