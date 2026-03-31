'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Mail, FileText, HelpCircle, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { orgNavPath } from '@/lib/org-nav-path'
import { hasAllPermissions } from '@luminum/org-permissions'
import {
  mobileManagementNavItems,
  mobilePrimaryNavItems,
  type OrgNavFlags,
} from '@/lib/org-mobile-nav'

interface AppTabBarProps {
  slug: string
  flatRoutes: boolean
  emailsEnabled?: boolean
  analyticsEnabled?: boolean
  blogsEnabled?: boolean
  whatsappEnabled?: boolean
  invoicesEnabled?: boolean
  organizationName: string
  organizationLogo?: string | null
  permissionSet?: Set<string>
}
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { orgLogoOrBrandProxy } from '@/lib/org-display-logo'

const tabs: {
  id: string
  label: string
  section: string
  icon: typeof LayoutDashboard
  emailsOnly?: boolean
  required: readonly string[]
}[] = [
  { id: 'dashboard', label: 'Home', section: 'dashboard', icon: LayoutDashboard, required: ['dashboard:view'] },
  { id: 'emails', label: 'Inbox', section: 'emails', icon: Mail, emailsOnly: true, required: ['email:read'] },
  { id: 'forms', label: 'Forms', section: 'forms', icon: FileText, required: ['forms:read'] },
  { id: 'support', label: 'Help', section: 'support', icon: HelpCircle, required: ['support:read'] },
  { id: 'more', label: 'More', section: 'settings', icon: MoreHorizontal, required: ['org:settings:read'] },
]

function pathMatches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function AppTabBar({
  slug,
  flatRoutes,
  emailsEnabled = false,
  analyticsEnabled = false,
  blogsEnabled = false,
  whatsappEnabled = false,
  invoicesEnabled = false,
  organizationName,
  organizationLogo,
  permissionSet,
}: AppTabBarProps) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const hrefFor = useCallback((section: string) => orgNavPath(slug, flatRoutes, section), [slug, flatRoutes])

  const orgFlags: OrgNavFlags = useMemo(
    () => ({
      analytics_enabled: analyticsEnabled,
      blogs_enabled: blogsEnabled,
      emails_enabled: emailsEnabled,
      whatsapp_enabled: whatsappEnabled,
      invoices_enabled: invoicesEnabled,
    }),
    [analyticsEnabled, blogsEnabled, emailsEnabled, whatsappEnabled, invoicesEnabled],
  )

  const primaryNav = useMemo(
    () => mobilePrimaryNavItems(slug, flatRoutes, orgFlags, permissionSet),
    [slug, flatRoutes, orgFlags, permissionSet],
  )
  const managementNav = useMemo(
    () => mobileManagementNavItems(slug, flatRoutes, permissionSet),
    [slug, flatRoutes, permissionSet],
  )

  let visibleTabs = tabs.filter((t) => {
    if (t.emailsOnly && !emailsEnabled) return false
    if (permissionSet === undefined) return true
    return hasAllPermissions(permissionSet, t.required)
  })
  if (visibleTabs.length === 0) {
    visibleTabs = [tabs[0]!]
  }

  const dashHref = hrefFor('dashboard')
  const emailsHref = hrefFor('emails')
  const formsHref = hrefFor('forms')
  const supportHref = hrefFor('support')

  const isPrimaryShortcut = useMemo(() => {
    if (pathMatches(pathname, dashHref)) return true
    if (emailsEnabled && pathMatches(pathname, emailsHref)) return true
    if (pathMatches(pathname, formsHref)) return true
    if (pathMatches(pathname, supportHref)) return true
    return false
  }, [pathname, dashHref, emailsHref, formsHref, supportHref, emailsEnabled])

  const navigate = (href: string) => {
    router.push(href)
    setMoreOpen(false)
  }

  const brandSrc = organizationLogo?.trim() || orgLogoOrBrandProxy(organizationLogo, organizationName)

  return (
    <>
      <nav
        className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-border/50 bg-background/92 backdrop-blur-xl pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.45)]"
        role="tablist"
        aria-label="Main navigation"
      >
        {visibleTabs.map((tab) => {
          const href = hrefFor(tab.section)

          if (tab.id === 'more') {
            const moreActive = !isPrimaryShortcut
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={moreActive}
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen(true)}
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold tracking-tight transition-colors active:scale-[0.97]',
                  moreActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {moreActive && (
                  <motion.span
                    layoutId="tab-active-pill"
                    className="absolute -top-1 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-primary"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <tab.icon className="h-[23px] w-[23px] shrink-0" strokeWidth={moreActive ? 2.25 : 1.75} />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          }

          const isActive =
            tab.id === 'dashboard'
              ? pathMatches(pathname, href)
              : tab.id === 'emails'
                ? pathMatches(pathname, href)
                : tab.id === 'forms'
                  ? pathMatches(pathname, href)
                  : pathMatches(pathname, href)

          return (
            <Link
              key={tab.id}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold tracking-tight transition-colors active:scale-[0.97]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-active-pill"
                  className="absolute -top-1 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-primary"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                />
              )}
              <tab.icon className="h-[23px] w-[23px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="truncate">{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] rounded-t-2xl border-t border-border/60 p-0"
        >
          <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-4 text-left">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/15">
                <AvatarImage src={brandSrc} alt="" />
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {organizationName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="truncate text-left text-base">{organizationName}</SheetTitle>
                <p className="text-xs text-muted-foreground">All workspace areas</p>
              </div>
            </div>
          </SheetHeader>

          <div className="max-h-[min(58dvh,420px)] overflow-y-auto px-3 py-3">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>
            <div className="grid grid-cols-2 gap-2">
              {primaryNav.map((item) => (
                <Button
                  key={item.href}
                  variant="outline"
                  className="h-auto min-h-[3.25rem] flex-col gap-1 rounded-xl border-border/60 py-2.5 text-center shadow-none"
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium leading-tight">{item.title}</span>
                </Button>
              ))}
            </div>

            <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Management
            </p>
            <div className="flex flex-col gap-1">
              {managementNav.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="h-11 justify-start gap-3 rounded-xl px-3 text-left font-normal"
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {item.title}
                </Button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
