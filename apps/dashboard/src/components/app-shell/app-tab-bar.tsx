'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mail, FileText, HelpCircle, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs: { id: string; label: string; href: (slug: string) => string; icon: typeof LayoutDashboard; emailsOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Home', href: (s) => `/${s}/dashboard`, icon: LayoutDashboard },
  { id: 'emails', label: 'Inbox', href: (s) => `/${s}/emails`, icon: Mail, emailsOnly: true },
  { id: 'forms', label: 'Forms', href: (s) => `/${s}/forms`, icon: FileText },
  { id: 'support', label: 'Support', href: (s) => `/${s}/support`, icon: HelpCircle },
  { id: 'more', label: 'More', href: (s) => `/${s}/settings`, icon: MoreHorizontal },
]

interface AppTabBarProps {
  slug: string
  emailsEnabled?: boolean
}

export function AppTabBar({ slug, emailsEnabled = false }: AppTabBarProps) {
  const pathname = usePathname()

  const visibleTabs = tabs.filter((t) => !t.emailsOnly || emailsEnabled)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border/40 bg-background/95 backdrop-blur supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] pb-2 pt-2"
      role="tablist"
    >
      {visibleTabs.map((tab) => {
        const href = tab.href(slug)
        const isActive =
          tab.id === 'more'
            ? pathname === `/${slug}/settings` || pathname === `/${slug}/team` || pathname === `/${slug}/billing`
            : pathname === href || (tab.id === 'emails' && pathname?.startsWith(`/${slug}/emails`)) || (tab.id === 'forms' && pathname?.startsWith(`/${slug}/forms`))

        return (
          <Link
            key={tab.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
