'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getNotificationTypeStyle, formatRelativeTime } from '@/lib/notifications/utils';
import { Notification } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth/client';

interface RealtimeNotificationPopupProps {
  notification: Notification;
  onClose: () => void;
  duration?: number; // Duration in milliseconds (default: 5000ms)
}

export function RealtimeNotificationPopup({
  notification,
  onClose,
  duration = 5000,
}: RealtimeNotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const style = getNotificationTypeStyle(notification.type);

  // Show animation on mount
  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-close after duration
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration]);

  const handleClose = async () => {
    setIsExiting(true);
    
    // Mark as read if user is logged in and notification has a valid ID
    if (userId && notification.id && !notification.id.startsWith('ably-')) {
      try {
        await api.notifications.markRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Wait for exit animation to complete
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const handleClick = async () => {
    // Mark as read
    if (userId && notification.id && !notification.id.startsWith('ably-')) {
      try {
        await api.notifications.markRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to URL if available
    const url = notification.data?.url;
    if (url) {
      handleClose();
      
      // Use router for internal navigation
      if (url.startsWith('/')) {
        router.push(url);
      } else {
        // External link
        window.open(url, '_blank');
      }
    } else {
      // Just close if no URL
      handleClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 w-full max-w-sm transition-all duration-300 ease-out',
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      )}
      style={{
        transform: isVisible && !isExiting ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <Card
        className={cn(
          'relative overflow-hidden shadow-lg cursor-pointer border-l-4 transition-all hover:shadow-xl',
          style.bgColor,
          isExiting && 'opacity-0 scale-95'
        )}
        style={{
          borderLeftColor: style.badgeColor.includes('green') ? '#22c55e' :
                           style.badgeColor.includes('blue') ? '#3b82f6' :
                           style.badgeColor.includes('orange') ? '#f97316' :
                           style.badgeColor.includes('red') ? '#ef4444' :
                           style.badgeColor.includes('purple') ? '#a855f7' : '#6b7280'
        }}
        onClick={handleClick}
        onMouseEnter={() => {
          // Pause auto-close on hover
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        }}
        onMouseLeave={() => {
          // Resume auto-close
          if (duration > 0 && !isExiting) {
            timeoutRef.current = setTimeout(() => {
              handleClose();
            }, duration);
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-lg',
                style.badgeColor,
                style.badgeTextColor
              )}
            >
              {style.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className={cn('text-sm font-semibold', style.color)}>
                  {notification.title}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {(notification.priority || notification.data?.priority) && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 h-4',
                      notification.priority === 'high' &&
                        'border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400',
                      notification.data?.priority === 'urgent' &&
                        'border-red-300 text-red-700 dark:border-red-600 dark:text-red-400'
                    )}
                  >
                    {notification.data?.priority || notification.priority}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(notification.timestamp)}
                </span>
                {notification.data?.url && (
                  <span className="text-[10px] text-primary flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Click to open
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Progress bar */}
        {duration > 0 && !isExiting && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
            <div
              className={cn('h-full transition-all linear', style.badgeColor)}
              style={{
                animation: `shrink ${duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </Card>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Container component for managing multiple notification popups
 */
export function RealtimeNotificationPopupContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Listen for realtime notifications from the useNotifications hook
    const handleRealtimeNotification = (event: CustomEvent<Notification>) => {
      const notification = event.detail;
      setNotifications((prev) => {
        // Check if notification already exists
        const exists = prev.find(n => n.id === notification.id);
        if (exists) return prev;
        return [...prev, notification];
      });
    };

    // Listen for custom event
    window.addEventListener('realtime-notification', handleRealtimeNotification as EventListener);

    return () => {
      window.removeEventListener('realtime-notification', handleRealtimeNotification as EventListener);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full">
      {notifications.map((notification, index) => (
        <div
          key={notification.id || `${notification.timestamp}-${index}`}
          className="pointer-events-auto animate-in slide-in-from-right-full duration-300"
        >
          <RealtimeNotificationPopup
            notification={notification}
            onClose={() => removeNotification(notification.id || `${notification.timestamp}-${index}`)}
            duration={
              notification.data?.priority === 'urgent' ? 10000 : 
              notification.priority === 'high' ? 8000 : 
              5000
            }
          />
        </div>
      ))}
    </div>
  );
}

