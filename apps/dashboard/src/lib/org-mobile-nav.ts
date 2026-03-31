import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CreditCard,
  FileText,
  Gauge,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import { orgNavPath } from '@/lib/org-nav-path'

export interface OrgNavFlags {
  analytics_enabled?: boolean
  blogs_enabled?: boolean
  emails_enabled?: boolean
  whatsapp_enabled?: boolean
  invoices_enabled?: boolean
}

export interface MobileNavItem {
  title: string
  icon: LucideIcon
  href: string
}

export function mobilePrimaryNavItems(
  slug: string,
  flatRoutes: boolean,
  org: OrgNavFlags,
): MobileNavItem[] {
  return [
    { title: 'Dashboard', icon: LayoutDashboard, href: orgNavPath(slug, flatRoutes, 'dashboard') },
    ...(org.analytics_enabled
      ? [{ title: 'Analytics', icon: Globe, href: orgNavPath(slug, flatRoutes, 'analytics') }]
      : []),
    { title: 'Site Audits', icon: Gauge, href: orgNavPath(slug, flatRoutes, 'audits') },
    { title: 'Forms', icon: FileText, href: orgNavPath(slug, flatRoutes, 'forms') },
    ...(org.blogs_enabled
      ? [{ title: 'Blog', icon: BookOpen, href: orgNavPath(slug, flatRoutes, 'blogs') }]
      : []),
    ...(org.emails_enabled
      ? [{ title: 'Emails', icon: Mail, href: orgNavPath(slug, flatRoutes, 'emails') }]
      : []),
    ...(org.whatsapp_enabled
      ? [{ title: 'WhatsApp', icon: MessageCircle, href: orgNavPath(slug, flatRoutes, 'whatsapp') }]
      : []),
    ...(org.invoices_enabled
      ? [{ title: 'Invoices', icon: Receipt, href: orgNavPath(slug, flatRoutes, 'invoices') }]
      : []),
    { title: 'Team', icon: Users, href: orgNavPath(slug, flatRoutes, 'team') },
    { title: 'Settings', icon: Settings, href: orgNavPath(slug, flatRoutes, 'settings') },
  ]
}

export function mobileManagementNavItems(slug: string, flatRoutes: boolean): MobileNavItem[] {
  return [
    { title: 'Billing', icon: CreditCard, href: orgNavPath(slug, flatRoutes, 'billing') },
    { title: 'Reports', icon: FileText, href: orgNavPath(slug, flatRoutes, 'reports') },
    { title: 'Support', icon: HelpCircle, href: orgNavPath(slug, flatRoutes, 'support') },
  ]
}
