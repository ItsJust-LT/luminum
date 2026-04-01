/**
 * Notification system types for Proton integration
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: number;
  read: boolean;
  persistent?: boolean;
  actions?: NotificationAction[];
  priority: 'low' | 'normal' | 'high';
  channel?: string;
  userId?: string;
  organizationId?: string;
  /** Lucide icon name from server (PascalCase). */
  iconKey?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  action?: string;
  style?: 'primary' | 'secondary' | 'destructive';
  variant?: 'primary' | 'secondary';
  kind?: 'navigate' | 'api';
  href?: string;
  method?: 'POST';
  path?: string;
  body?: Record<string, unknown>;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  channels: {
    [channel: string]: {
      enabled: boolean;
      types: string[];
    };
  };
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  type: 'user' | 'organization' | 'system' | 'broadcast';
  permissions: string[];
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
    system: number;
  };
  byChannel: {
    [channel: string]: number;
  };
}

export interface NotificationFilter {
  type?: string;
  channel?: string;
  read?: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  search?: string;
}
