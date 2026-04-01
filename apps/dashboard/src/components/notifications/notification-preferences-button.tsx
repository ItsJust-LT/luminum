'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { NotificationPreferencesPanel } from './notification-preferences-panel';

export function NotificationPreferencesButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Notification preferences"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
          <DialogDescription>
            Manage how and when you receive notifications.{' '}
            <Link href="/account/settings/notifications" className="text-primary underline-offset-4 hover:underline">
              Open full settings
            </Link>
          </DialogDescription>
        </DialogHeader>
        <NotificationPreferencesPanel onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

