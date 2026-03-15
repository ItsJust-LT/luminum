'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getNotificationTypeStyle, formatRelativeTime } from '@/lib/notifications/utils';
import { Notification } from '@/lib/notifications/types';
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
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const style = getNotificationTypeStyle(notification.type);

  // Show animation on mount
  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);

    // Progress bar animation
    if (duration > 0) {
      const startTime = Date.now();
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        
        if (remaining > 0 && !isExiting) {
          progressRef.current = setTimeout(updateProgress, 16);
        }
      };
      updateProgress();

      // Auto-close after duration
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressRef.current) clearTimeout(progressRef.current);
    };
  }, [duration]);

  const handleClose = async () => {
    if (isExiting) return;
    setIsExiting(true);
    
    if (userId && notification.id && !notification.id.startsWith('ably-')) {
      try {
        await api.notifications.markRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = async () => {
    if (userId && notification.id && !notification.id.startsWith('ably-')) {
      try {
        await api.notifications.markRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    const url = notification.data?.url;
    if (url) {
      handleClose();
      if (url.startsWith('/')) {
        router.push(url);
      } else {
        window.open(url, '_blank');
      }
    } else {
      handleClose();
    }
  };

  const pauseProgress = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressRef.current) clearTimeout(progressRef.current);
  };

  const resumeProgress = () => {
    if (isExiting) return;
    const remaining = (progress / 100) * duration;
    timeoutRef.current = setTimeout(() => {
      handleClose();
    }, remaining);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, x: 400, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 400, scale: 0.8 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
            delay: index * 0.1
          }}
          className="w-full max-w-sm"
          onMouseEnter={pauseProgress}
          onMouseLeave={resumeProgress}
        >
          <Card
            className={cn(
              'relative overflow-hidden shadow-xl cursor-pointer border-l-4 transition-all hover:shadow-2xl hover:scale-[1.02]',
              'bg-background/95 backdrop-blur-xl dark:bg-background/98',
              'border-border/50 dark:border-border/30',
              isExiting && 'opacity-0 scale-95',
              style.bgColor
            )}
            style={{
              borderLeftColor: style.badgeColor.includes('green') ? '#22c55e' :
                               style.badgeColor.includes('blue') ? '#3b82f6' :
                               style.badgeColor.includes('orange') ? '#f97316' :
                               style.badgeColor.includes('red') ? '#ef4444' :
                               style.badgeColor.includes('purple') ? '#a855f7' : '#6b7280'
            }}
            onClick={handleClick}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon or sender avatar */}
                {notification.type === 'email_received' && notification.data?.fromEmail ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                    className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden ring-2 ring-background/50 dark:ring-background/30 shadow-lg"
                  >
                    <EmailAvatar
                      email={notification.data.fromEmail}
                      imageUrl={notification.data.fromAvatarUrl}
                      size={48}
                      className="h-12 w-12"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                    className={cn(
                      'flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center shadow-lg',
                      'ring-2 ring-background/50 dark:ring-background/30',
                      style.badgeColor,
                      style.badgeTextColor
                    )}
                  >
                    {getNotificationIconForBadge(notification.type, 'h-6 w-6')}
                  </motion.div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className={cn('text-sm font-bold leading-tight', style.color)}>
                      {notification.title}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0 hover:bg-muted/60 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                    {notification.message}
                  </p>
                  {notification.type === 'email_received' && notification.data?.fromEmail && (
                    <p className="text-[11px] text-muted-foreground font-mono truncate mb-2" title={notification.data.fromEmail}>
                      From: {notification.data.fromEmail}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {(notification.priority || notification.data?.priority) && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 h-4 font-medium',
                          notification.priority === 'high' &&
                            'border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20',
                          notification.data?.priority === 'urgent' &&
                            'border-red-300 text-red-700 dark:border-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                        )}
                      >
                        {notification.data?.priority || notification.priority}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(notification.timestamp)}
                    </span>
                    {notification.data?.url && (
                      <span className="text-[10px] text-primary flex items-center gap-1 font-medium">
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Progress bar */}
            {duration > 0 && !isExiting && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
                <motion.div
                  className={cn('h-full', style.badgeColor)}
                  style={{
                    width: `${progress}%`,
                  }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Container component for managing multiple notification popups
 */
export function EnhancedNotificationPopupContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleRealtimeNotification = (event: CustomEvent<Notification>) => {
      const notification = event.detail;
      setNotifications((prev) => {
        const exists = prev.find(n => n.id === notification.id);
        if (exists) return prev;
        return [...prev, notification];
      });
    };

    window.addEventListener('realtime-notification', handleRealtimeNotification as EventListener);

    return () => {
      window.removeEventListener('realtime-notification', handleRealtimeNotification as EventListener);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none flex flex-col gap-3 max-w-sm w-[calc(100%-2rem)] sm:w-full">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <div key={notification.id || `${notification.timestamp}-${index}`} className="pointer-events-auto">
            <EnhancedNotificationPopup
              notification={notification}
              onClose={() => removeNotification(notification.id || `${notification.timestamp}-${index}`)}
              duration={
                notification.data?.priority === 'urgent' ? 10000 : 
                notification.priority === 'high' ? 8000 : 
                5000
              }
              index={index}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

