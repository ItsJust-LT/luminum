'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification, NotificationAction } from '@/lib/notifications/types';
import {
  getVisibleNotificationActions,
  isMarkResourceReadActionId,
} from '@/lib/notifications/action-visibility';
import { runNotificationAction } from '@/lib/notifications/run-notification-action';
import { cn } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';

const AUTO_DISMISS_MS = 5200;
const EXIT_MS = 200;

function typeAccent(type: string): { bar: string; icon: string } {
  switch (type) {
    case 'success':
      return {
        bar: 'bg-emerald-500',
        icon: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'warning':
      return {
        bar: 'bg-amber-500',
        icon: 'text-amber-600 dark:text-amber-400',
      };
    case 'error':
      return {
        bar: 'bg-red-500',
        icon: 'text-red-600 dark:text-red-400',
      };
    case 'system':
      return {
        bar: 'bg-primary',
        icon: 'text-primary',
      };
    default:
      return {
        bar: 'bg-muted-foreground/45',
        icon: 'text-muted-foreground',
      };
  }
}

function ToastTypeIcon({ type }: { type: string }) {
  const { icon } = typeAccent(type);
  const cls = cn('h-4 w-4', icon);
  switch (type) {
    case 'success':
      return <CheckCircle className={cls} aria-hidden />;
    case 'warning':
      return <AlertTriangle className={cls} aria-hidden />;
    case 'error':
      return <AlertCircle className={cls} aria-hidden />;
    case 'system':
      return <Bell className={cls} aria-hidden />;
    default:
      return <Info className={cls} aria-hidden />;
  }
}

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onAction?: (action: NotificationAction) => void | Promise<void>;
}

export function NotificationToast({ notification, onClose, onAction }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const visibleActions = useMemo(
    () => getVisibleNotificationActions(notification, { includeOpen: true }),
    [notification]
  );

  const accent = typeAccent(notification.type);

  useEffect(() => {
    const enter = requestAnimationFrame(() => setIsVisible(true));
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    let exitCompleteTimer: ReturnType<typeof setTimeout> | undefined;

    if (!notification.persistent) {
      dismissTimer = setTimeout(() => {
        setIsExiting(true);
        exitCompleteTimer = setTimeout(() => onCloseRef.current(), EXIT_MS);
      }, AUTO_DISMISS_MS);
    }

    return () => {
      cancelAnimationFrame(enter);
      if (dismissTimer) clearTimeout(dismissTimer);
      if (exitCompleteTimer) clearTimeout(exitCompleteTimer);
    };
  }, [notification.persistent, notification.id]);

  const finishClose = () => {
    setIsExiting(true);
    setTimeout(() => onCloseRef.current(), EXIT_MS);
  };

  const handleDismiss = () => {
    if (pendingActionId) return;
    finishClose();
  };

  const handleActionClick = async (action: NotificationAction) => {
    if (pendingActionId) return;
    setPendingActionId(action.id);
    try {
      await onAction?.(action);
      finishClose();
    } catch {
      sonnerToast.error('Could not complete that action. Try again from notifications.');
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'pointer-events-auto w-[min(100vw-2rem,20rem)] transition-[opacity,transform] duration-200 ease-out',
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
      )}
    >
      <div className="flex overflow-hidden rounded-lg border border-border/80 bg-card text-card-foreground shadow-md">
        <div className={cn('w-[3px] shrink-0 self-stretch', accent.bar)} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-2.5 p-3 pr-2">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/80"
              aria-hidden
            >
              <ToastTypeIcon type={notification.type} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start gap-1">
                <h4 className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
                  {notification.title}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={handleDismiss}
                  disabled={!!pendingActionId}
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {notification.message ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
              ) : null}
              {visibleActions.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {visibleActions.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      variant={
                        action.style === 'primary' || action.variant === 'primary'
                          ? 'default'
                          : isMarkResourceReadActionId(action.id)
                            ? 'ghost'
                            : 'outline'
                      }
                      size="sm"
                      disabled={!!pendingActionId}
                      className={cn(
                        'h-7 rounded-md px-2.5 text-xs font-medium',
                        isMarkResourceReadActionId(action.id) &&
                          'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => void handleActionClick(action)}
                    >
                      {pendingActionId === action.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        action.label
                      )}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {!notification.persistent ? (
            <div className="h-0.5 w-full shrink-0 overflow-hidden bg-muted" aria-hidden>
              <motion.div
                className="h-full bg-foreground/12 dark:bg-foreground/20"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function NotificationToastManager() {
  const { notifications, markAsRead } = useNotifications();
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

  useEffect(() => {
    const recentNotifications = notifications
      .filter((n) => !n.read && Date.now() - n.timestamp < 300000)
      .slice(0, 3);
    setActiveToasts(recentNotifications);
  }, [notifications]);

  const handleToastClose = async (notificationId: string) => {
    await markAsRead(notificationId);
    setActiveToasts((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleToastAction = async (notification: Notification, action: NotificationAction) => {
    await runNotificationAction(notification, action);
  };

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[190] flex flex-col gap-2',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))]',
        'sm:bottom-auto sm:right-4 sm:top-4'
      )}
    >
      {activeToasts.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => void handleToastClose(notification.id)}
          onAction={(action) => handleToastAction(notification, action)}
        />
      ))}
    </div>
  );
}
