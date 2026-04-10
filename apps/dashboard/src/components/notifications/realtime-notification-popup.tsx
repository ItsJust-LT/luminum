'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNotificationTypeStyle, formatRelativeTime } from '@/lib/notifications/utils';
import type { Notification } from '@/lib/notifications/types';
import { getNotificationIconForBadge } from '@/components/notifications/notification-icons';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth/client';
import { motion, AnimatePresence } from 'framer-motion';

interface RealtimeNotificationPopupProps {
  notification: Notification;
  onClose: () => void;
  duration?: number;
}

/** @deprecated Prefer EnhancedNotificationPopup — kept for any legacy imports. */
export function RealtimeNotificationPopup({
  notification,
  onClose,
  duration = 5000,
}: RealtimeNotificationPopupProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef(0);
  const totalMsRef = useRef(duration);
  const pausedRemainingRef = useRef<number | null>(null);
  const isExitingRef = useRef(false);
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

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
    if (userId && notification.id && !notification.id.startsWith('ably-')) {
      try {
        await api.notifications.markRead(notification.id);
      } catch {
        /* ignore */
      }
    }
    setTimeout(() => onClose(), 280);
  }, [clearTimers, notification.id, onClose, userId]);

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
    if (userId && notification.id && !notification.id.startsWith('ably-')) {
      try {
        await api.notifications.markRead(notification.id);
      } catch {
        /* ignore */
      }
    }
    const url = notification.data?.url;
    if (url) {
      void handleClose();
      if (url.startsWith('/')) router.push(url);
      else window.open(url, '_blank');
    } else void handleClose();
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24 }}
      className="w-full max-w-sm"
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
          'relative cursor-pointer overflow-hidden rounded-2xl border border-border/60',
          'bg-card shadow-xl ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
        )}
      >
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl" style={{ backgroundColor: accent }} />
        <div className="relative pl-4 pr-3 py-3">
          <div className="flex gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                style.badgeColor,
                style.badgeTextColor
              )}
            >
              {getNotificationIconForBadge(notification.type, 'h-5 w-5', notification.iconKey)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                  {notification.title}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 rounded-full p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleClose();
                  }}
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>{formatRelativeTime(notification.timestamp)}</span>
                {notification.data?.url && (
                  <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                    Open <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {duration > 0 && !isExiting && (
          <div className="h-0.5 w-full bg-muted/60">
            <div
              className="h-full transition-[width] duration-75 ease-linear"
              style={{ width: `${progress}%`, backgroundColor: accent }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function RealtimeNotificationPopupContainer() {
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
        'fixed z-[199] flex w-full max-w-sm flex-col gap-2 pointer-events-none',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))]',
        'sm:bottom-auto sm:top-4 sm:right-4'
      )}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <div key={notification.id || `${notification.timestamp}-${index}`} className="pointer-events-auto">
            <RealtimeNotificationPopup
              notification={notification}
              onClose={() => removeNotification(notification.id || `${notification.timestamp}-${index}`)}
              duration={
                notification.data?.priority === 'urgent'
                  ? 12000
                  : notification.priority === 'high'
                    ? 9000
                    : 5500
              }
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
