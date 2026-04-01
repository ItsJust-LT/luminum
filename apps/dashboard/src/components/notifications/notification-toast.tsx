'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotifications } from '@/hooks/use-notifications';
import { Notification } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export function NotificationToast({ notification, onClose, onAction }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show toast after a brief delay
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-hide after 5 seconds (unless persistent)
    const hideTimer = setTimeout(() => {
      if (!notification.persistent) {
        handleClose();
      }
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [notification.persistent]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action);
    }
    handleClose();
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'system':
        return <Bell className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'system':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 w-80 max-w-sm transform transition-all duration-300 ease-in-out",
        isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <Card className={cn("shadow-lg", getNotificationStyles())}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {notification.actions.map((action) => (
                    <Button
                      key={action.id}
                      variant={
                        action.style === 'primary' || action.variant === 'primary'
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() =>
                        handleAction(action.action ?? action.id ?? 'open')
                      }
                      className="text-xs h-7"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Toast manager component
export function NotificationToastManager() {
  const { notifications, markAsRead } = useNotifications();
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

  useEffect(() => {
    // Get recent unread notifications (last 5 minutes)
    const recentNotifications = notifications
      .filter(n => !n.read && Date.now() - n.timestamp < 300000) // 5 minutes
      .slice(0, 3); // Max 3 toasts at once

    setActiveToasts(recentNotifications);
  }, [notifications]);

  const handleToastClose = async (notificationId: string) => {
    await markAsRead(notificationId);
    setActiveToasts(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleAction = (notificationId: string, action: string) => {
    console.log(`Action ${action} triggered for notification ${notificationId}`);
    // Handle action logic here
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {activeToasts.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => handleToastClose(notification.id)}
          onAction={(action) => handleAction(notification.id, action)}
        />
      ))}
    </div>
  );
}
