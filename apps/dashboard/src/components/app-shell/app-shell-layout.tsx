'use client'

import type React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { Building2, Settings, LogOut } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import { AppTabBar } from './app-tab-bar'

function getRoleColor(role: string) {
  switch (role) {
    case 'owner':
      return 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 dark:from-violet-950/50 dark:to-purple-950/50 dark:text-violet-300 ring-1 ring-violet-200/50 dark:ring-violet-800/30'
    case 'admin':
      return 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 dark:from-slate-900/50 dark:to-gray-900/50 dark:text-slate-300 ring-1 ring-slate-200/50 dark:ring-slate-700/30'
    case 'member':
      return 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 dark:from-emerald-950/50 dark:to-green-950/50 dark:text-emerald-300 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30'
    default:
      return 'bg-muted/50 text-muted-foreground ring-1 ring-border/30'
  }
}

export interface AppShellLayoutProps {
  slug: string
  organizationName: string
  organizationLogo?: string | null
  emailsEnabled: boolean
  userRole: string
  sessionUser: { name?: string | null; image?: string | null; email?: string | null }
  onSignOut: () => void | Promise<void>
  children: React.ReactNode
}

export function AppShellLayout({
  slug,
  organizationName,
  organizationLogo,
  emailsEnabled,
  userRole,
  sessionUser,
  onSignOut,
  children,
}: AppShellLayoutProps) {
  const router = useRouter()
  const roleColor = getRoleColor(userRole)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/98 px-3 pt-[env(safe-area-inset-top)]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <Image src="/images/logo.png" alt="Luminum" width={18} height={18} className="h-4 w-4" />
            </div>
            <span className="truncate text-sm font-semibold text-foreground">{organizationName}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <div className="rounded-lg hover:bg-muted/50">
            <NotificationBell />
          </div>
          <Badge className={`${roleColor} hidden text-xs sm:inline-flex`} variant="secondary">
            {(userRole || 'member').replace(/^./, (c) => c.toUpperCase())}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Account menu">
                <Avatar className="h-8 w-8 ring-2 ring-background">
                  <AvatarImage src={sessionUser.image ?? ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {sessionUser.name?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push(`/${slug}/settings`)}>
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                <Building2 className="mr-2 h-4 w-4" />
                Switch Organization
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-3 pb-24 bg-background/50">
        {children}
      </main>

      <AppTabBar slug={slug} emailsEnabled={emailsEnabled} />
    </div>
  )
}
