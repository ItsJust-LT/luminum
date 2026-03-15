'use client';

import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSession } from '@/lib/auth/client';
import { api } from '@/lib/api';
import { NotificationType } from '@/lib/types/notifications';
import { getNotificationTypeStyle } from '@/lib/notifications/utils';
import { Loader2, Check } from 'lucide-react';

interface NotificationPreferencesPanelProps {
  onClose?: () => void;
}

export function NotificationPreferencesPanel({ onClose }: NotificationPreferencesPanelProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    pushEnabled: true,
    inAppEnabled: true,
    emailEnabled: true,
    disabledTypes: [] as string[],
    quietHoursStart: null as string | null,
    quietHoursEnd: null as string | null,
  });

  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await api.notificationPreferences.get();
      if (result.success && result.preferences) {
        setPreferences({
          pushEnabled: result.preferences.pushEnabled,
          inAppEnabled: result.preferences.inAppEnabled,
          emailEnabled: result.preferences.emailEnabled,
          disabledTypes: result.preferences.disabledTypes || [],
          quietHoursStart: result.preferences.quietHoursStart,
          quietHoursEnd: result.preferences.quietHoursEnd,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const result = await api.notificationPreferences.update({
        push_enabled: preferences.pushEnabled,
        in_app_enabled: preferences.inAppEnabled,
        email_enabled: preferences.emailEnabled,
        disabled_types: preferences.disabledTypes,
        quiet_hours_start: preferences.quietHoursStart,
        quiet_hours_end: preferences.quietHoursEnd,
      });
      
      if (result.success) {
        // Show success feedback
        setTimeout(() => {
          onClose?.();
        }, 500);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleNotificationType = (type: string) => {
    setPreferences(prev => ({
      ...prev,
      disabledTypes: prev.disabledTypes.includes(type)
        ? prev.disabledTypes.filter(t => t !== type)
        : [...prev.disabledTypes, type]
    }));
  };

  const notificationTypes: NotificationType[] = [
    'member_joined',
    'member_left',
    'member_invited',
    'member_role_changed',
    'invitation_accepted',
    'invitation_cancelled',
    'form_submission',
    'email_received',
    'new_user_registered',
    'organization_created',
    'organization_deleted',
    'new_support_ticket',
    'support_message',
    'support_ticket_updated',
    'support_ticket_resolved',
    'system_announcement',
    'maintenance_notice',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-enabled">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications on your device
              </p>
            </div>
            <Switch
              id="push-enabled"
              checked={preferences.pushEnabled}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, pushEnabled: checked }))
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in-app-enabled">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the app
              </p>
            </div>
            <Switch
              id="in-app-enabled"
              checked={preferences.inAppEnabled}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, inAppEnabled: checked }))
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, emailEnabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notificationTypes.map((type) => {
              const style = getNotificationTypeStyle(type);
              const isEnabled = !preferences.disabledTypes.includes(type);
              
              return (
                <div
                  key={type}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border
                    ${isEnabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{style.icon}</span>
                    <Label
                      htmlFor={`type-${type}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                  <Switch
                    id={`type-${type}`}
                    checked={isEnabled}
                    onCheckedChange={() => toggleNotificationType(type)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quiet Hours</CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <input
                id="quiet-start"
                type="time"
                value={preferences.quietHoursStart || ''}
                onChange={(e) =>
                  setPreferences(prev => ({ ...prev, quietHoursStart: e.target.value || null }))
                }
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <input
                id="quiet-end"
                type="time"
                value={preferences.quietHoursEnd || ''}
                onChange={(e) =>
                  setPreferences(prev => ({ ...prev, quietHoursEnd: e.target.value || null }))
                }
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          {(preferences.quietHoursStart || preferences.quietHoursEnd) && (
            <p className="text-sm text-muted-foreground">
              Notifications will be muted between{' '}
              {preferences.quietHoursStart || '00:00'} and{' '}
              {preferences.quietHoursEnd || '23:59'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

