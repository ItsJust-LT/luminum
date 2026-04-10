'use client'

import type React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'
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
      return 'bg-primary/12 text-primary'
    case 'admin':
      return 'bg-chart-2/12 text-chart-2'
    case 'member':
      return 'bg-chart-5/12 text-chart-5'
    default:
      return 'bg-muted/80 text-muted-foreground'
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
  permissionSet?: Set<string>
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
  permissionSet,
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
    <div className="mobile-app-root flex min-h-[100dvh] flex-col touch-manipulation bg-gradient-to-b from-background via-background to-muted/30">
      <header
        className={cn(
          'sticky top-0 z-50 flex shrink-0 items-center gap-2.5 px-4 pt-[env(safe-area-inset-top)]',
          chrome.headerSurface,
        )}
        style={{ height: 'calc(3.25rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center gap-2 rounded-2xl bg-muted/50 px-2 py-1 pr-2.5 sm:max-w-[min(100%,18rem)] sm:gap-2.5 sm:px-2.5 sm:py-1.5 sm:pr-3">
            <Avatar className="h-8 w-8 shrink-0 rounded-xl shadow-none ring-0 sm:h-9 sm:w-9">
              <AvatarImage src={brandSrc} alt={organizationName || 'Luminum'} className="object-contain p-1" />
              <AvatarFallback className="rounded-xl bg-primary/15 text-sm font-semibold text-primary">
                {(organizationName || 'L').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[15px] font-semibold tracking-tight text-foreground sm:text-base">{organizationName}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <div className="flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-foreground/[0.06]">
            <NotificationBell />
          </div>
          <Badge className={`${roleColor} hidden border-0 shadow-none text-xs sm:inline-flex`} variant="secondary">
            {(userRole || 'member').replace(/^./, (c) => c.toUpperCase())}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full active:scale-95 transition-transform" aria-label="Account menu">
                <Avatar className="h-8 w-8 shadow-none ring-0">
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
          'scrollbar-app min-h-0 flex-1 overflow-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-3 md:pt-4',
          chrome.mainSurface,
          isWhatsappRoute || isMailRoute ? 'p-0 overflow-hidden min-h-0 flex flex-col' : 'px-3 pb-5 sm:px-4 md:px-6',
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
        permissionSet={permissionSet}
      />
    </div>
  )
}
