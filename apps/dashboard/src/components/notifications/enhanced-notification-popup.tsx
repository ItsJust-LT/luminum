'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNotificationTypeStyle, formatRelativeTime } from '@/lib/notifications/utils';
import type { Notification } from '@/lib/notifications/types';
import { EmailAvatar } from '@/components/emails/email-avatar';
import { getNotificationIconForBadge } from '@/components/notifications/notification-icons';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth/client';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedNotificationPopupProps {
  notification: Notification;
  onClose: () => void;
  duration?: number;
  index?: number;
}

export function EnhancedNotificationPopup({
  notification,
  onClose,
  duration = 5000,
  index = 0,
}: EnhancedNotificationPopupProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef<number>(0);
  const totalMsRef = useRef(duration);
  const pausedRemainingRef = useRef<number | null>(null);
  const isExitingRef = useRef(false);
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const notificationIdRef = useRef(notification.id);
  notificationIdRef.current = notification.id;

  const style = getNotificationTypeStyle(notification.type);
  const accent = style.accentHex;

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    closeTimerRef.current = null;
    progressIntervalRef.current = null;
  }, []);

  const handleClose = useCallback(async () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    clearTimers();

    const nid = notificationIdRef.current;
    if (userId && nid && !nid.startsWith('ably-')) {
      try {
        await api.notifications.markRead(nid);
      } catch {
        /* ignore */
      }
    }

    setTimeout(() => onCloseRef.current(), 280);
  }, [clearTimers, userId]);

  const scheduleAutoClose = useCallback(
    (ms: number) => {
      clearTimers();
      if (ms <= 0) return;
      totalMsRef.current = ms;
      endAtRef.current = Date.now() + ms;
      setProgress(100);

      progressIntervalRef.current = setInterval(() => {
        const left = Math.max(0, endAtRef.current - Date.now());
        setProgress(totalMsRef.current > 0 ? (left / totalMsRef.current) * 100 : 0);
      }, 48);

      closeTimerRef.current = setTimeout(() => void handleClose(), ms);
    },
    [clearTimers, handleClose]
  );

  useEffect(() => {
    isExitingRef.current = false;
    pausedRemainingRef.current = null;
    if (duration <= 0) {
      setProgress(0);
      return;
    }
    scheduleAutoClose(duration);
    return () => clearTimers();
  }, [duration, notification.id, scheduleAutoClose, clearTimers]);

  const handleClick = async () => {
    const nid = notificationIdRef.current;
    if (userId && nid && !nid.startsWith('ably-')) {
      try {
        await api.notifications.markRead(nid);
      } catch {
        /* ignore */
      }
    }

    const url = notification.data?.url;
    if (url) {
      void handleClose();
      if (url.startsWith('/')) {
        router.push(url);
      } else {
        window.open(url, '_blank');
      }
    } else {
      void handleClose();
    }
  };

  const pause = () => {
    if (duration <= 0 || isExitingRef.current) return;
    const left = Math.max(0, endAtRef.current - Date.now());
    pausedRemainingRef.current = left;
    clearTimers();
    setProgress(totalMsRef.current > 0 ? (left / totalMsRef.current) * 100 : 0);
  };

  const resume = () => {
    if (duration <= 0 || isExitingRef.current) return;
    const ms = pausedRemainingRef.current;
    pausedRemainingRef.current = null;
    if (ms != null && ms > 0) scheduleAutoClose(ms);
  };

  const urgent = notification.data?.priority === 'urgent' || notification.priority === 'high';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 28, scale: 0.94, transition: { duration: 0.22 } }}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 32,
        delay: index * 0.06,
      }}
      className="w-full max-w-[min(100vw-1.5rem,22rem)]"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => void handleClick()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void handleClick();
          }
        }}
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-2xl text-left shadow-2xl',
          'border border-border/60 bg-card',
          'ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
          'transition-[box-shadow,transform] duration-200 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.28)]',
          'dark:hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]',
          urgent && 'ring-2 ring-destructive/40 ring-offset-2 ring-offset-background',
        )}
      >
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
          style={{ backgroundColor: accent }}
          aria-hidden
        />

        <div className="relative pl-4 pr-3 py-3.5 sm:pl-4.5 sm:pr-3.5">
          <div className="flex gap-3">
            {notification.type === 'email_received' && notification.data?.fromEmail ? (
              <div className="relative shrink-0">
                <div
                  className="h-11 w-11 overflow-hidden rounded-2xl ring-2 ring-background shadow-md"
                  style={{ boxShadow: `0 0 0 1px ${accent}33` }}
                >
                  <EmailAvatar
                    email={notification.data.fromEmail}
                    imageUrl={notification.data.fromAvatarUrl}
                    size={44}
                    className="h-11 w-11"
                  />
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-inner',
                  style.badgeColor,
                  style.badgeTextColor,
                )}
              >
                {getNotificationIconForBadge(notification.type, 'h-5 w-5', notification.iconKey)}
              </div>
            )}

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <h4
                  className={cn(
                    'text-[13px] font-semibold leading-snug tracking-tight text-foreground',
                    'line-clamp-2',
                  )}
                >
                  {notification.title}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleClose();
                  }}
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {notification.message}
              </p>

              {notification.type === 'email_received' && notification.data?.fromEmail && (
                <p
                  className="mt-1.5 truncate text-[11px] text-muted-foreground/80"
                  title={notification.data.fromEmail}
                >
                  {notification.data.fromEmail}
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {formatRelativeTime(notification.timestamp)}
                </span>
                {(notification.data?.priority || notification.priority) && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      notification.data?.priority === 'urgent' || notification.priority === 'high'
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {notification.data?.priority || notification.priority}
                  </span>
                )}
                {notification.data?.url && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    Open
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {duration > 0 && !isExiting && (
          <div className="h-0.5 w-full bg-muted/80 dark:bg-muted/50">
            <div
              className="h-full transition-[width] duration-75 ease-linear"
              style={{
                width: `${progress}%`,
                backgroundColor: accent,
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EnhancedNotificationPopupContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleRealtimeNotification = (event: CustomEvent<Notification>) => {
      const n = event.detail;
      setNotifications((prev) => {
        if (prev.some((x) => x.id === n.id)) return prev;
        return [...prev, n];
      });
    };

    window.addEventListener('realtime-notification', handleRealtimeNotification as EventListener);
    return () =>
      window.removeEventListener('realtime-notification', handleRealtimeNotification as EventListener);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div
      className={cn(
        'fixed z-[200] flex w-full max-w-[min(100vw-1.5rem,22rem)] flex-col gap-2 pointer-events-none',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))]',
        'sm:bottom-auto sm:top-4 sm:right-4',
      )}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <div key={notification.id} className="pointer-events-auto">
            <EnhancedNotificationPopup
              notification={notification}
              onClose={() => removeNotification(notification.id)}
              duration={
                notification.data?.priority === 'urgent'
                  ? 12000
                  : notification.priority === 'high'
                    ? 9000
                    : 5500
              }
              index={index}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
