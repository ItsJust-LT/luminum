'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Mail, FileText, HelpCircle, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { orgNavPath } from '@/lib/org-nav-path'

const tabs: {
  id: string
  label: string
  section: string
  icon: typeof LayoutDashboard
  emailsOnly?: boolean
}[] = [
  { id: 'dashboard', label: 'Home', section: 'dashboard', icon: LayoutDashboard },
  { id: 'emails', label: 'Inbox', section: 'emails', icon: Mail, emailsOnly: true },
  { id: 'forms', label: 'Forms', section: 'forms', icon: FileText },
  { id: 'support', label: 'Support', section: 'support', icon: HelpCircle },
  { id: 'more', label: 'More', section: 'settings', icon: MoreHorizontal },
]

interface AppTabBarProps {
  slug: string
  flatRoutes: boolean
  emailsEnabled?: boolean
}

export function AppTabBar({ slug, flatRoutes, emailsEnabled = false }: AppTabBarProps) {
  const pathname = usePathname()
  const hrefFor = (section: string) => orgNavPath(slug, flatRoutes, section)

  const visibleTabs = tabs.filter((t) => !t.emailsOnly || emailsEnabled)

  const settingsPath = hrefFor('settings')
  const teamPath = hrefFor('team')
  const billingPath = hrefFor('billing')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-border/40 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0.5rem)] pt-1.5"
      role="tablist"
    >
      {visibleTabs.map((tab) => {
        const href = hrefFor(tab.section)
        const isActive =
          tab.id === 'more'
            ? pathname === settingsPath ||
              pathname === teamPath ||
              pathname === billingPath ||
              pathname?.startsWith(`${settingsPath}/`) ||
              pathname?.startsWith(`${teamPath}/`) ||
              pathname?.startsWith(`${billingPath}/`)
            : pathname === href ||
              (tab.id === 'emails' && (pathname?.startsWith(`${href}/`) ?? false)) ||
              (tab.id === 'forms' && (pathname?.startsWith(`${href}/`) ?? false))

        return (
          <Link
            key={tab.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 text-[11px] font-medium transition-colors active:scale-95',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="tab-active-pill"
                className="absolute -top-1.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-primary"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
              />
            )}
            <tab.icon className="h-[22px] w-[22px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="truncate">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
