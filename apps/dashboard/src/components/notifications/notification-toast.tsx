'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onAction?: (action: string) => void;
}

function toastIcon(type: string) {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    case 'system':
      return <Bell className="h-5 w-5 text-primary" />;
    default:
      return <Info className="h-5 w-5 text-muted-foreground" />;
  }
}

function toastSurface(type: string) {
  switch (type) {
    case 'success':
      return 'border-emerald-500/25 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]';
    case 'warning':
      return 'border-amber-500/25 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]';
    case 'error':
      return 'border-red-500/25 bg-red-500/[0.06] dark:bg-red-500/[0.08]';
    case 'system':
      return 'border-primary/25 bg-primary/[0.06]';
    default:
      return 'border-border bg-card';
  }
}

export function NotificationToast({ notification, onClose, onAction }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 80);
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    if (!notification.persistent) {
      hideTimer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(), 280);
      }, 5200);
    }
    return () => {
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [notification.persistent, notification.id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(), 280);
  };

  const handleAction = (action: string) => {
    onAction?.(action);
    handleClose();
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-[min(100vw-1.5rem,22rem)] transition-all duration-300 ease-out',
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0'
      )}
    >
      <div
        className={cn(
          'overflow-hidden rounded-2xl border shadow-xl backdrop-blur-xl',
          'ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
          toastSurface(notification.type)
        )}
      >
        <div className="flex gap-3 p-3.5">
          <div className="mt-0.5 shrink-0">{toastIcon(notification.type)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold leading-snug tracking-tight text-foreground">
                {notification.title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-muted"
                onClick={handleClose}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {notification.actions.map((action) => (
                  <Button
                    key={action.id}
                    variant={
                      action.style === 'primary' || action.variant === 'primary' ? 'default' : 'outline'
                    }
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => handleAction(action.action ?? action.id ?? 'open')}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
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

  const handleAction = (notificationId: string, action: string) => {
    console.log(`Action ${action} triggered for notification ${notificationId}`);
  };

  return (
    <div
      className={cn(
        'fixed z-[190] flex flex-col gap-2 pointer-events-none',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))]',
        'sm:bottom-auto sm:top-4 sm:right-4'
      )}
    >
      {activeToasts.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => void handleToastClose(notification.id)}
          onAction={(action) => handleAction(notification.id, action)}
        />
      ))}
    </div>
  );
}
