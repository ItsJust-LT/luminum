'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Trash2, Bell, ExternalLink, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/use-notifications';
import { Notification } from '@/lib/notifications/types';
import { EmailAvatar } from '@/components/emails/email-avatar';
import { getNotificationIcon } from '@/components/notifications/notification-icons';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/notifications/utils';

interface NotificationDropdownProps {
  onClose: () => void;
}

function getNotificationActions(notification: Notification): { label: string; url?: string; primary?: boolean }[] {
  const url = notification.data?.url;
  const type = notification.type as string;
  switch (type) {
    case 'email_received':
      return [{ label: 'Open email', url, primary: true }];
    case 'form_submission':
      return [{ label: 'View submission', url, primary: true }];
    case 'member_joined':
    case 'member_left':
    case 'member_invited':
    case 'member_role_changed':
    case 'invitation_accepted':
    case 'invitation_cancelled':
      return url ? [{ label: 'View team', url, primary: true }] : [];
    case 'new_support_ticket':
    case 'support_message':
    case 'support_ticket_updated':
    case 'support_ticket_resolved':
      return url ? [{ label: 'Open ticket', url, primary: true }] : [];
    case 'organization_created':
    case 'organization_deleted':
      return url ? [{ label: 'View', url, primary: true }] : [];
    default:
      return url ? [{ label: 'Open', url, primary: true }] : [];
  }
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const {
    notifications,
    isConnected,
    isLoading,
    error,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredNotifications = getNotifications(filter === 'unread' ? { read: false } : undefined);

  const handleOpen = async (notification: Notification, actionUrl?: string) => {
    const url = actionUrl ?? notification.data?.url;
    if (!notification.read) {
      setMarkingId(notification.id);
      await markAsRead(notification.id);
      setMarkingId(null);
    }
    if (url?.startsWith('/')) {
      onClose();
      router.push(url);
    } else if (url) {
      window.open(url, '_blank');
      onClose();
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setMarkingId(notificationId);
    await markAsRead(notificationId);
    setMarkingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  if (!isConnected) {
    return (
      <div
        ref={dropdownRef}
        className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,28rem)] rounded-2xl border bg-card shadow-xl"
      >
        <Card className="border-0 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {isLoading ? 'Loading notifications…' : 'Notifications unavailable'}
            </p>
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,28rem)] rounded-2xl border bg-card shadow-xl overflow-hidden"
    >
      <Card className="border-0 shadow-none rounded-2xl">
        <CardHeader className="pb-3 pt-5 px-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            <div className="flex items-center gap-1">
              {stats.unread > 0 && (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {stats.unread} unread
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="flex-1 rounded-lg h-8 text-xs font-medium"
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="flex-1 rounded-lg h-8 text-xs font-medium"
            >
              Unread
            </Button>
            {stats.unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="rounded-lg h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>

        <ScrollArea className="h-[min(24rem,70vh)]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="rounded-full bg-muted/80 p-5 mb-4">
                <Bell className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                {filter === 'unread' ? 'You’re all caught up.' : 'When you get notifications, they’ll show here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredNotifications.map((notification) => {
                const actions = getNotificationActions(notification);
                const primaryAction = actions.find((a) => a.primary) ?? actions[0];
                const isMarking = markingId === notification.id;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'group relative px-5 py-3.5 transition-colors',
                      !notification.read && 'bg-primary/5 dark:bg-primary/10',
                      'hover:bg-muted/50'
                    )}
                  >
                    <div
                      className="flex gap-3 cursor-pointer"
                      onClick={() => primaryAction?.url && handleOpen(notification, primaryAction.url)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {(notification.type as string) === 'email_received' && notification.data?.fromEmail ? (
                          <EmailAvatar
                            email={notification.data.fromEmail}
                            imageUrl={notification.data.fromAvatarUrl}
                            size={40}
                            className="h-10 w-10"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/80">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm leading-snug', !notification.read && 'font-semibold text-foreground')}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                        {(notification.type as string) === 'email_received' && notification.data?.fromEmail && (
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono truncate" title={notification.data.fromEmail}>
                            {notification.data.fromEmail}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {primaryAction?.url && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs rounded-md gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpen(notification, primaryAction.url);
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {primaryAction.label}
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs rounded-md gap-1.5 text-muted-foreground"
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              disabled={isMarking}
                            >
                              {isMarking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(e, notification.id)}
                          aria-label="Remove notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
