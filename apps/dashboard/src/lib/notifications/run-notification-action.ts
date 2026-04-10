import { api } from '@/lib/api';
import type { Notification, NotificationAction } from '@/lib/notifications/types';
import { isMarkResourceReadActionId } from '@/lib/notifications/action-visibility';

export async function runNotificationAction(
  notification: Notification,
  action: NotificationAction
): Promise<void> {
  if (action.kind === 'api') {
    if (isMarkResourceReadActionId(action.id)) {
      await api.notifications.performAction(notification.id, action.id);
      return;
    }
    if (action.path && action.method === 'POST') {
      const path = action.path.startsWith('/') ? action.path : `/${action.path}`;
      const res = await fetch(`/api/proxy${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body ?? {}),
      });
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
    }
    return;
  }
  if (action.kind === 'navigate' && action.href) {
    if (action.href.startsWith('/')) {
      window.location.href = action.href;
    } else {
      window.open(action.href, '_blank', 'noopener,noreferrer');
    }
    return;
  }
}
