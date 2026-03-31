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
import { NAV_ITEM_REQUIRED_PERMISSIONS, hasAllPermissions } from '@luminum/org-permissions'
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

function allowedNav(key: string, permissionSet: Set<string> | undefined): boolean {
  if (permissionSet === undefined) return true
  const req = NAV_ITEM_REQUIRED_PERMISSIONS[key]
  if (!req) return true
  return hasAllPermissions(permissionSet, req)
}

export function mobilePrimaryNavItems(
  slug: string,
  flatRoutes: boolean,
  org: OrgNavFlags,
  permissionSet?: Set<string>,
): MobileNavItem[] {
  const items: MobileNavItem[] = []
  if (allowedNav('dashboard', permissionSet)) {
    items.push({ title: 'Dashboard', icon: LayoutDashboard, href: orgNavPath(slug, flatRoutes, 'dashboard') })
  }
  if (org.analytics_enabled && allowedNav('analytics', permissionSet)) {
    items.push({ title: 'Analytics', icon: Globe, href: orgNavPath(slug, flatRoutes, 'analytics') })
  }
  if (allowedNav('audits', permissionSet)) {
    items.push({ title: 'Site Audits', icon: Gauge, href: orgNavPath(slug, flatRoutes, 'audits') })
  }
  if (allowedNav('forms', permissionSet)) {
    items.push({ title: 'Forms', icon: FileText, href: orgNavPath(slug, flatRoutes, 'forms') })
  }
  if (org.blogs_enabled && allowedNav('blogs', permissionSet)) {
    items.push({ title: 'Blog', icon: BookOpen, href: orgNavPath(slug, flatRoutes, 'blogs') })
  }
  if (org.emails_enabled && allowedNav('emails', permissionSet)) {
    items.push({ title: 'Emails', icon: Mail, href: orgNavPath(slug, flatRoutes, 'emails') })
  }
  if (org.whatsapp_enabled && allowedNav('whatsapp', permissionSet)) {
    items.push({ title: 'WhatsApp', icon: MessageCircle, href: orgNavPath(slug, flatRoutes, 'whatsapp') })
  }
  if (org.invoices_enabled && allowedNav('invoices', permissionSet)) {
    items.push({ title: 'Invoices', icon: Receipt, href: orgNavPath(slug, flatRoutes, 'invoices') })
  }
  if (allowedNav('team', permissionSet)) {
    items.push({ title: 'Team', icon: Users, href: orgNavPath(slug, flatRoutes, 'team') })
  }
  if (allowedNav('settings', permissionSet)) {
    items.push({ title: 'Settings', icon: Settings, href: orgNavPath(slug, flatRoutes, 'settings') })
  }
  return items
}

export function mobileManagementNavItems(
  slug: string,
  flatRoutes: boolean,
  permissionSet?: Set<string>,
): MobileNavItem[] {
  const items: MobileNavItem[] = []
  if (allowedNav('billing', permissionSet)) {
    items.push({ title: 'Billing', icon: CreditCard, href: orgNavPath(slug, flatRoutes, 'billing') })
  }
  if (allowedNav('reports', permissionSet)) {
    items.push({ title: 'Reports', icon: FileText, href: orgNavPath(slug, flatRoutes, 'reports') })
  }
  if (allowedNav('support', permissionSet)) {
    items.push({ title: 'Support', icon: HelpCircle, href: orgNavPath(slug, flatRoutes, 'support') })
  }
  return items
}
