/**
 * React hook for notifications with Ably realtime support
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/lib/auth/client';
import { fetchNotifications, getUnreadCount as getUnreadCountAction, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications/actions';
import { Notification, NotificationFilter, NotificationStats } from '@/lib/notifications/types';
import { useUserNotificationChannel } from '@/lib/ably/client';
import { UserNotificationEvents } from '@/lib/ably/events';

// Convert database notification to client notification format
function convertToNotification(record: any): Notification {
  return {
    id: record.id,
    type: (record.type as any) || 'info',
    title: record.title || '',
    message: record.message || '',
    data: record.data || {},
    timestamp: new Date(record.created_at).getTime(),
    read: record.read || false,
    persistent: record.data?.persistent || false,
    actions: record.data?.actions || [],
    priority: record.data?.priority || 'normal',
    userId: record.user_id,
    organizationId: record.data?.organizationId,
  };
}

// Convert Ably notification data to client notification format
function convertAblyNotification(eventType: string, data: any): Notification {
  return {
    id: data.id || `ably-${Date.now()}-${Math.random()}`,
    type: (data.type as any) || 'info',
    title: data.title || 'Notification',
    message: data.message || '',
    data: data.data || data,
    timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
    read: false,
    priority: (data.priority === 'urgent' ? 'high' : data.priority) || 'normal',
    userId: data.userId,
    organizationId: data.organizationId,
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: { info: 0, success: 0, warning: 0, error: 0, system: 0 },
    byChannel: {}
  });

  const { data: session, isPending } = useSession();

  // Load notifications from database
  const loadNotifications = useCallback(async (userId: string) => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { items } = await fetchNotifications(undefined, 50);
      const converted = items.map(convertToNotification);
      setNotifications(converted);
      updateStats(converted);
    } catch (err: any) {
      console.error('Error loading notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      const result = await getUnreadCountAction();
      if (result && typeof result === 'object' && 'unread' in result) {
        setStats(prev => ({ ...prev, unread: result.unread }));
      }
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, []);

  // Update stats from notifications
  const updateStats = useCallback((notifs: Notification[]) => {
    const unread = notifs.filter(n => !n.read).length;
    const byType = {
      info: notifs.filter(n => n.type === 'info').length,
      success: notifs.filter(n => n.type === 'success').length,
      warning: notifs.filter(n => n.type === 'warning').length,
      error: notifs.filter(n => n.type === 'error').length,
      system: notifs.filter(n => n.type === 'system').length,
    };
    
    setStats({
      total: notifs.length,
      unread,
      byType,
      byChannel: {}
    });
  }, []);

  // Handle realtime notifications from Ably
  const handleRealtimeNotification = useCallback((eventType: string, data: any) => {
    const notification = convertAblyNotification(eventType, data);
    
    // Add notification to the list
    setNotifications(prev => {
      const exists = prev.find(n => n.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });
    
    // Update stats
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      unread: prev.unread + 1,
    }));
    
    // Trigger custom event for popup component
    window.dispatchEvent(new CustomEvent('realtime-notification', { 
      detail: notification 
    }));
  }, []);

  // Subscribe to user notification channel
  const { connected: ablyConnected } = useUserNotificationChannel(handleRealtimeNotification)
  
  useEffect(() => {
    setIsConnected(ablyConnected)
  }, [ablyConnected])

  // Load initial notifications
  useEffect(() => {
    if (isPending) return;

    if (session?.user?.id) {
      const userId = session.user.id;
      
      // Load initial notifications only once
      // Real-time updates come from Ably WebSocket
      loadNotifications(userId);
      loadUnreadCount(userId);
    } else {
      setNotifications([]);
      setStats({
        total: 0,
        unread: 0,
        byType: { info: 0, success: 0, warning: 0, error: 0, system: 0 },
        byChannel: {}
      });
      setIsConnected(false);
    }
  }, [session, isPending, loadNotifications, loadUnreadCount]);

  // Public API methods
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!session?.user?.id) return;
    
    try {
      await markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      updateStats(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
      await loadUnreadCount(session.user.id);
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
    }
  }, [session, notifications, updateStats, loadUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      updateStats(notifications.map(n => ({ ...n, read: true })));
      await loadUnreadCount(session.user.id);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
    }
  }, [session, notifications, updateStats, loadUnreadCount]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    updateStats(notifications.filter(n => n.id !== notificationId));
  }, [notifications, updateStats]);

  const getNotifications = useCallback((filter?: NotificationFilter) => {
    let filtered = [...notifications];
    
    if (filter?.read !== undefined) {
      filtered = filtered.filter(n => n.read === filter.read);
    }
    
    if (filter?.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }
    
    if (filter?.channel) {
      filtered = filtered.filter(n => n.channel === filter.channel);
    }
    
    return filtered;
  }, [notifications]);

  const getUnreadCount = useCallback(() => {
    return stats.unread;
  }, [stats]);

  const getStats = useCallback(() => {
    return stats;
  }, [stats]);

  const getSubscriptionInfo = useCallback(() => {
    return {
      subscribed: isConnected,
      channels: isConnected ? [`notifications:user:${session?.user?.id}`] : [],
      isConnected: isConnected
    };
  }, [isConnected, session]);

  const checkAndFixConnection = useCallback(async () => {
    // Connection is managed by the hook, just return current status
    return isConnected;
  }, [isConnected]);

  const forceReconnect = useCallback(async () => {
    // Reload notifications
    if (session?.user?.id) {
      await loadNotifications(session.user.id);
      await loadUnreadCount(session.user.id);
    }
    return true;
  }, [session, loadNotifications, loadUnreadCount]);

  return {
    // State
    notifications,
    isConnected,
    isLoading,
    error,
    stats,
    
    // Actions
    sendNotification: async () => {
      throw new Error('Sending notifications via hook is not supported. Use sendNotification from helpers instead.');
    },
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotifications,
    getUnreadCount,
    getStats,
    getSubscriptionInfo,
    checkAndFixConnection,
    forceReconnect,
    
    // Computed
    unreadCount: stats.unread,
    hasUnread: stats.unread > 0,
  };
}
