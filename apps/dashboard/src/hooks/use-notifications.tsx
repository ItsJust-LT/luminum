/**
 * React hook for notifications with unified WebSocket realtime support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/lib/auth/client';
import { api } from '@/lib/api';
import { Notification, NotificationFilter, NotificationStats } from '@/lib/notifications/types';
import { useRealtime } from '@/components/realtime/realtime-provider';

function convertToNotification(record: any): Notification {
  const data = record.data || {};
  const actions = record.actions ?? data.actions ?? [];
  return {
    id: record.id,
    type: (record.type as any) || 'info',
    title: record.title || '',
    message: record.message || '',
    data: { ...data, actions },
    timestamp: new Date(record.created_at).getTime(),
    read: record.read || false,
    persistent: data.persistent || false,
    actions,
    priority: data.priority || 'normal',
    userId: record.user_id,
    organizationId: record.organizationId ?? data.organizationId,
    iconKey: record.iconKey ?? data.iconKey,
  };
}

function convertWsNotification(row: any): Notification {
  const inner = row.data && typeof row.data === 'object' ? row.data : {};
  const actions = inner.actions ?? row.actions ?? [];
  return {
    id: row.id || `ws-${Date.now()}-${Math.random()}`,
    type: (row.type as any) || 'info',
    title: row.title || 'Notification',
    message: row.message || '',
    data: { ...inner, actions },
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    read: row.read ?? false,
    priority: (inner.priority === 'urgent' ? 'high' : inner.priority) || 'normal',
    userId: row.user_id,
    organizationId: row.organization_id ?? inner.organizationId,
    iconKey: inner.iconKey,
    actions,
  };
}

export function useNotifications(organizationId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: { info: 0, success: 0, warning: 0, error: 0, system: 0 },
    byChannel: {}
  });

  const { data: session, isPending } = useSession();
  const orgFilterRef = useRef(organizationId);
  orgFilterRef.current = organizationId;

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

  const loadNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { items, nextCursor: nc } = await api.notifications.fetch(
        undefined,
        50,
        orgFilterRef.current
      );
      const converted = (items || []).map(convertToNotification);
      setNotifications(converted);
      setNextCursor(nc);
      updateStats(converted);
    } catch (err: any) {
      console.error('Error loading notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, updateStats]);

  const loadUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const result = await api.notifications.getUnreadCount(orgFilterRef.current);
      if (result && typeof result === 'object' && 'unread' in result) {
        setStats(prev => ({ ...prev, unread: (result as { unread: number }).unread }));
      }
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, [session?.user?.id]);

  const loadMore = useCallback(async () => {
    if (!session?.user?.id || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const { items, nextCursor: nc } = await api.notifications.fetch(
        nextCursor,
        20,
        orgFilterRef.current
      );
      const more = (items || []).map(convertToNotification);
      setNotifications(prev => {
        const next = [...prev, ...more];
        updateStats(next);
        return next;
      });
      setNextCursor(nc);
    } catch (err: any) {
      console.error('Error loading more notifications:', err);
      setError(err.message || 'Failed to load more');
    } finally {
      setIsLoadingMore(false);
    }
  }, [session?.user?.id, nextCursor, isLoadingMore, updateStats]);

  const { connected: wsConnected, onMessage } = useRealtime();

  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  useEffect(() => {
    const unsubscribe = onMessage('notification', (data: any) => {
      const notification = convertWsNotification(data);

      setNotifications(prev => {
        if (prev.find(n => n.id === notification.id)) return prev;
        const next = [notification, ...prev];
        updateStats(next);
        return next;
      });

      window.dispatchEvent(new CustomEvent('realtime-notification', {
        detail: notification,
      }));
    });

    return unsubscribe;
  }, [onMessage, updateStats]);

  useEffect(() => {
    const unsubscribe = onMessage('notification:read', (payload: any) => {
      setNotifications(prev => {
        let next = prev;
        if (payload?.all) {
          next = prev.map(n => ({ ...n, read: true }));
        } else if (payload?.id) {
          next = prev.map(n =>
            n.id === payload.id ? { ...n, read: true } : n
          );
        } else if (Array.isArray(payload?.ids)) {
          const set = new Set(payload.ids as string[]);
          next = prev.map(n =>
            set.has(n.id) ? { ...n, read: true } : n
          );
        } else {
          return prev;
        }
        const unread = next.filter(n => !n.read).length;
        setStats(s => ({ ...s, unread, total: next.length }));
        return next;
      });
      void loadUnreadCount();
    });

    return unsubscribe;
  }, [onMessage, loadUnreadCount]);

  useEffect(() => {
    if (isPending) return;

    if (session?.user?.id) {
      void loadNotifications();
      void loadUnreadCount();
    } else {
      setNotifications([]);
      setNextCursor(null);
      setStats({
        total: 0,
        unread: 0,
        byType: { info: 0, success: 0, warning: 0, error: 0, system: 0 },
        byChannel: {}
      });
      setIsConnected(false);
    }
  }, [session, isPending, organizationId, loadNotifications, loadUnreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!session?.user?.id) return;

    try {
      await api.notifications.markRead(notificationId);
      setNotifications(prev => {
        const next = prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        const unread = next.filter(n => !n.read).length;
        setStats(s => ({ ...s, unread, total: next.length }));
        return next;
      });
      await loadUnreadCount();
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
    }
  }, [session?.user?.id, loadUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      await api.notifications.markAllRead();
      setNotifications(prev => {
        const next = prev.map(n => ({ ...n, read: true }));
        setStats(s => ({ ...s, unread: 0, total: next.length }));
        return next;
      });
      await loadUnreadCount();
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
    }
  }, [session?.user?.id, loadUnreadCount]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== notificationId);
      updateStats(next);
      return next;
    });
  }, [updateStats]);

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
    return isConnected;
  }, [isConnected]);

  const forceReconnect = useCallback(async () => {
    if (session?.user?.id) {
      await loadNotifications();
      await loadUnreadCount();
    }
    return true;
  }, [session?.user?.id, loadNotifications, loadUnreadCount]);

  return {
    notifications,
    nextCursor,
    hasMore: !!nextCursor,
    isLoading,
    isLoadingMore,
    isConnected,
    error,
    stats,

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
    loadMore,
    refresh: loadNotifications,

    unreadCount: stats.unread,
    hasUnread: stats.unread > 0,
  };
}
