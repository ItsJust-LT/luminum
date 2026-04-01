'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { NotificationType } from '@/lib/types/notifications';
import { getNotificationTypeStyle } from '@/lib/notifications/utils';
import { formatRelativeTime } from '@/lib/notifications/utils';
import { getNotificationIconForBadge } from '@/components/notifications/notification-icons';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/notifications/types';

const TEAM_TYPES: NotificationType[] = [
  'member_joined',
  'member_left',
  'member_invited',
  'member_role_changed',
  'invitation_accepted',
  'invitation_cancelled',
];

const FORMS_TYPES: NotificationType[] = ['form_submission'];

const EMAIL_TYPES: NotificationType[] = ['email_received'];

const INVOICE_TYPES: NotificationType[] = ['invoice_created', 'invoice_paid'];

const BLOG_TYPES: NotificationType[] = ['blog_post_published'];

const SUPPORT_TYPES: NotificationType[] = [
  'new_support_ticket',
  'support_message',
  'support_ticket_updated',
  'support_ticket_resolved',
];

const SYSTEM_TYPES: NotificationType[] = [
  'system_announcement',
  'maintenance_notice',
];

const ADMIN_TYPES: NotificationType[] = [
  'new_user_registered',
  'organization_created',
  'organization_deleted',
];

const PREVIEW_SAMPLES: Notification[] = [
  {
    id: 'preview-1',
    type: 'email_received',
    title: 'New email from Alex',
    message: 'Re: Project timeline',
    timestamp: Date.now() - 120_000,
    read: false,
    priority: 'normal',
    iconKey: 'Mail',
    data: { url: '/demo/emails/1' },
  },
  {
    id: 'preview-2',
    type: 'form_submission',
    title: 'New Form Submission',
    message: 'Contact form on Marketing site',
    timestamp: Date.now() - 3600_000,
    read: true,
    priority: 'normal',
    iconKey: 'ClipboardList',
    data: {},
  },
];

function labelForType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function AccountNotificationSettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [disabledTypes, setDisabledTypes] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [prefsReady, setPrefsReady] = useState(false);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const toggleType = (type: string) => {
    setDisabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setPrefsReady(false);
    try {
      const result = await api.notificationPreferences.get();
      if (result.success && result.preferences) {
        setPushEnabled(result.preferences.pushEnabled);
        setInAppEnabled(result.preferences.inAppEnabled);
        setEmailEnabled(result.preferences.emailEnabled);
        setDisabledTypes(result.preferences.disabledTypes || []);
      }
    } finally {
      setLoading(false);
      setPrefsReady(true);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push('/sign-in');
      return;
    }
    void load();
  }, [session, isPending, router, load]);

  useEffect(() => {
    if (!prefsReady || !session?.user?.id) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      void (async () => {
        try {
          await api.notificationPreferences.update({
            push_enabled: pushEnabled,
            in_app_enabled: inAppEnabled,
            email_enabled: emailEnabled,
            disabled_types: disabledTypes,
          });
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 2000);
        } catch {
          setSaveState('error');
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [prefsReady, pushEnabled, inAppEnabled, emailEnabled, disabledTypes, session?.user?.id]);

  const renderTypeMatrix = (title: string, description: string | undefined, types: NotificationType[]) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {types.map((type) => {
          const style = getNotificationTypeStyle(type);
          const on = !disabledTypes.includes(type);
          return (
            <div
              key={type}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                on
                  ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
                  : 'border-border bg-muted/20'
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    style.badgeColor,
                    style.badgeTextColor
                  )}
                >
                  {getNotificationIconForBadge(type, 'h-4 w-4')}
                </span>
                <Label htmlFor={`sett-${type}`} className="cursor-pointer truncate text-sm font-medium">
                  {labelForType(type)}
                </Label>
              </div>
              <Switch
                id={`sett-${type}`}
                checked={on}
                onCheckedChange={() => toggleType(type)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
      <div className="relative z-10 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <Link
              href="/account/settings"
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to account settings
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Global preferences for your account (not per organization).
                </p>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums min-h-[1rem]">
                {saveState === 'saving' && 'Saving…'}
                {saveState === 'saved' && 'Saved'}
                {saveState === 'error' && 'Could not save — try again'}
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channels</CardTitle>
              <CardDescription>How we may reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="ch-push">Push</Label>
                <Switch id="ch-push" checked={pushEnabled} onCheckedChange={setPushEnabled} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="ch-inapp">In-app</Label>
                <Switch id="ch-inapp" checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ch-email">Email</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Reserved for future digests</p>
                </div>
                <Switch id="ch-email" checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
            </CardContent>
          </Card>

          {renderTypeMatrix('Team', 'Membership and invitations', TEAM_TYPES)}
          {renderTypeMatrix('Forms', undefined, FORMS_TYPES)}
          {renderTypeMatrix('Email', 'Inbound mail alerts', EMAIL_TYPES)}
          {renderTypeMatrix('Invoices', undefined, INVOICE_TYPES)}
          {renderTypeMatrix('Blog', undefined, BLOG_TYPES)}
          {renderTypeMatrix('Support', undefined, SUPPORT_TYPES)}
          {renderTypeMatrix('System', 'Maintenance and announcements', SYSTEM_TYPES)}
          {isAdmin
            ? renderTypeMatrix('Admin', 'Platform administration', ADMIN_TYPES)
            : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Preview
              </CardTitle>
              <CardDescription>Examples of how rows appear in the notification list</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 divide-y rounded-md border bg-muted/10">
              {PREVIEW_SAMPLES.map((n) => {
                const style = getNotificationTypeStyle(n.type);
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 py-3 first:pt-0 last:pb-0 opacity-90 pointer-events-none"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        style.badgeColor,
                        style.badgeTextColor
                      )}
                    >
                      {getNotificationIconForBadge(n.type, 'h-5 w-5', n.iconKey)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatRelativeTime(n.timestamp)}
                        {n.read ? ' · Read' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
