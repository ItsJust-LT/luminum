'use client'

import type React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'
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
import { Settings, LogOut, User } from 'lucide-react'
import { orgNavPath } from '@/lib/org-nav-path'
import NotificationBell from '@/components/NotificationBell'
import { AppTabBar } from './app-tab-bar'
import { getMobileSectionChrome } from '@/lib/pwa/mobile-section-theme'
import { cn } from '@/lib/utils'

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
  flatRoutes: boolean
  organizationName: string
  organizationLogo?: string | null
  emailsEnabled: boolean
  analyticsEnabled?: boolean
  blogsEnabled?: boolean
  whatsappEnabled?: boolean
  invoicesEnabled?: boolean
  userRole: string
  sessionUser: { name?: string | null; image?: string | null; email?: string | null }
  onSignOut: () => void | Promise<void>
  children: React.ReactNode
}

export function AppShellLayout({
  slug,
  flatRoutes,
  organizationName,
  organizationLogo,
  emailsEnabled,
  analyticsEnabled = false,
  blogsEnabled = false,
  whatsappEnabled = false,
  invoicesEnabled = false,
  userRole,
  sessionUser,
  onSignOut,
  children,
}: AppShellLayoutProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const chrome = useMemo(
    () => getMobileSectionChrome(pathname, slug, flatRoutes),
    [pathname, slug, flatRoutes],
  )
  const whatsappPath = orgNavPath(slug, flatRoutes, 'whatsapp')
  const isWhatsappRoute = pathname === whatsappPath || pathname.startsWith(`${whatsappPath}/`)
  const emailsPath = orgNavPath(slug, flatRoutes, 'emails')
  const isMailRoute = pathname === emailsPath || pathname.startsWith(`${emailsPath}/`)

  const roleColor = getRoleColor(userRole)
  const accountSettingsHref = '/account/settings'
  const orgSettingsHref = orgNavPath(slug, flatRoutes, 'settings')
  const brandSrc = organizationLogo?.trim() || '/images/logo.png'

  return (
    <div className="mobile-app-root flex min-h-[100dvh] flex-col bg-background touch-manipulation">
      <header
        className={cn(
          'sticky top-0 z-50 flex shrink-0 items-center gap-2.5 backdrop-blur-md px-4 pt-[env(safe-area-inset-top)]',
          chrome.headerSurface,
        )}
        style={{ height: 'calc(3.25rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <Image
                src={brandSrc}
                alt={organizationName || 'Luminum'}
                width={18}
                height={18}
                className="h-4 w-4 object-contain"
                unoptimized
              />
            </div>
            <span className="truncate text-[15px] font-semibold text-foreground tracking-tight">{organizationName}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <div className="rounded-xl p-0.5 hover:bg-muted/50 transition-colors">
            <NotificationBell />
          </div>
          <Badge className={`${roleColor} hidden text-xs sm:inline-flex`} variant="secondary">
            {(userRole || 'member').replace(/^./, (c) => c.toUpperCase())}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full active:scale-95 transition-transform" aria-label="Account menu">
                <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                  <AvatarImage src={sessionUser.image ?? ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {sessionUser.name?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push(orgSettingsHref)} className="py-2.5">
                <Settings className="mr-2 h-4 w-4" />
                Workspace settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(accountSettingsHref)} className="py-2.5">
                <User className="mr-2 h-4 w-4" />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive py-2.5">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main
        className={cn(
          'min-h-0 flex-1 overflow-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]',
          chrome.mainSurface,
          isWhatsappRoute || isMailRoute ? 'p-0 overflow-hidden min-h-0 flex flex-col' : 'p-4',
        )}
      >
        {children}
      </main>

      <AppTabBar
        slug={slug}
        flatRoutes={flatRoutes}
        emailsEnabled={emailsEnabled}
        analyticsEnabled={analyticsEnabled}
        blogsEnabled={blogsEnabled}
        whatsappEnabled={whatsappEnabled}
        invoicesEnabled={invoicesEnabled}
        organizationName={organizationName}
        organizationLogo={organizationLogo}
      />
    </div>
  )
}
