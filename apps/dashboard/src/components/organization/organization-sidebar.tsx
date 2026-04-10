"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { BookOpen, CreditCard, FileText, Globe, HelpCircle, LayoutDashboard, Settings, Users, Mail, MessageCircle, Gauge, Receipt } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { NAV_ITEM_REQUIRED_PERMISSIONS, hasAllPermissions } from "@luminum/org-permissions"
import { orgNavPath } from "@/lib/org-nav-path"
import { orgLogoOrBrandProxy } from "@/lib/org-display-logo"

interface Organization {
  id: string
  name: string
  logo?: string | null
  emails_enabled?: boolean
  whatsapp_enabled?: boolean
  analytics_enabled?: boolean
  blogs_enabled?: boolean
  invoices_enabled?: boolean
}

export function OrganizationSidebar({
  workspaceSlug,
  flatRoutes,
  organization,
  initialUnseenFormsCount = 0,
  initialUnreadEmailsCount = 0,
  initialUnreadWhatsappCount = 0,
  initialEmailsEnabled = false,
  initialWhatsappEnabled = false,
  initialAnalyticsEnabled = false,
  initialBlogsEnabled = false,
  initialInvoicesEnabled = false,
  permissionSet,
  isLoading: externalIsLoading = false,
}: {
  workspaceSlug: string
  /** Custom-domain dashboard: URLs are /dashboard, /settings, … */
  flatRoutes: boolean
  organization: Organization
  sessionUser?: { name?: string | null; image?: string | null }
  onSignOut?: () => Promise<void> | void
  initialUnseenFormsCount?: number
  initialUnreadEmailsCount?: number
  initialUnreadWhatsappCount?: number
  initialEmailsEnabled?: boolean
  initialWhatsappEnabled?: boolean
  initialAnalyticsEnabled?: boolean
  initialBlogsEnabled?: boolean
  initialInvoicesEnabled?: boolean
  permissionSet?: Set<string>
  isLoading?: boolean
}) {
  const pathname = usePathname()
  const nav = (section: string) => orgNavPath(workspaceSlug, flatRoutes, section)
  const orgBrandSrc = orgLogoOrBrandProxy(organization.logo, organization.name)
  const [unseenFormsCount, setUnseenFormsCount] = useState(initialUnseenFormsCount)
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(initialUnreadEmailsCount)
  const [unreadWhatsappCount, setUnreadWhatsappCount] = useState(initialUnreadWhatsappCount)
  const [emailsEnabled, setEmailsEnabled] = useState(initialEmailsEnabled)
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialWhatsappEnabled)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(initialAnalyticsEnabled)
  const [blogsEnabled, setBlogsEnabled] = useState(initialBlogsEnabled ?? false)
  const [invoicesEnabled, setInvoicesEnabled] = useState(initialInvoicesEnabled ?? false)
  const [isLoading, setIsLoading] = useState(externalIsLoading)
  
  // Update state when props change
  useEffect(() => {
    setUnseenFormsCount(initialUnseenFormsCount)
    setUnreadEmailsCount(initialUnreadEmailsCount)
    setUnreadWhatsappCount(initialUnreadWhatsappCount)
    setEmailsEnabled(initialEmailsEnabled)
    setWhatsappEnabled(initialWhatsappEnabled)
    setAnalyticsEnabled(initialAnalyticsEnabled)
    setBlogsEnabled(initialBlogsEnabled ?? false)
    setInvoicesEnabled(initialInvoicesEnabled ?? false)
    setIsLoading(externalIsLoading)
  }, [initialUnseenFormsCount, initialUnreadEmailsCount, initialUnreadWhatsappCount, initialEmailsEnabled, initialWhatsappEnabled, initialAnalyticsEnabled, initialBlogsEnabled, initialInvoicesEnabled, externalIsLoading])

  const navOk = (key: string) => {
    if (permissionSet === undefined) return true
    const req = NAV_ITEM_REQUIRED_PERMISSIONS[key]
    if (!req) return true
    return hasAllPermissions(permissionSet, req)
  }

  type SidebarEntry = { title: string; icon: typeof LayoutDashboard; href: string; badge?: number }
  const sidebarItems: SidebarEntry[] = []
  if (navOk("dashboard")) sidebarItems.push({ title: "Dashboard", icon: LayoutDashboard, href: nav("dashboard") })
  if (analyticsEnabled && navOk("analytics")) sidebarItems.push({ title: "Analytics", icon: Globe, href: nav("analytics") })
  if (navOk("audits")) sidebarItems.push({ title: "Site Audits", icon: Gauge, href: nav("audits") })
  if (navOk("forms")) {
    sidebarItems.push({
      title: "Forms",
      icon: FileText,
      href: nav("forms"),
      badge: unseenFormsCount > 0 ? unseenFormsCount : undefined,
    })
  }
  if (blogsEnabled && navOk("blogs")) sidebarItems.push({ title: "Blog", icon: BookOpen, href: nav("blogs") })
  if (emailsEnabled && navOk("emails")) {
    sidebarItems.push({
      title: "Emails",
      icon: Mail,
      href: nav("emails"),
      badge: unreadEmailsCount > 0 ? unreadEmailsCount : undefined,
    })
  }
  if (whatsappEnabled && navOk("whatsapp")) {
    sidebarItems.push({
      title: "WhatsApp",
      icon: MessageCircle,
      href: nav("whatsapp"),
      badge: unreadWhatsappCount > 0 ? unreadWhatsappCount : undefined,
    })
  }
  if (invoicesEnabled && navOk("invoices")) {
    sidebarItems.push({ title: "Invoices", icon: Receipt, href: nav("invoices") })
  }
  if (navOk("team")) sidebarItems.push({ title: "Team", icon: Users, href: nav("team") })
  if (navOk("settings")) sidebarItems.push({ title: "Settings", icon: Settings, href: nav("settings") })

  const managementItems: { title: string; icon: typeof CreditCard; href: string }[] = []
  if (navOk("billing")) managementItems.push({ title: "Billing", icon: CreditCard, href: nav("billing") })
  if (navOk("reports")) managementItems.push({ title: "Reports", icon: FileText, href: nav("reports") })
  if (navOk("support")) managementItems.push({ title: "Support", icon: HelpCircle, href: nav("support") })

  const isActive = (href: string) => pathname?.startsWith(href)

  // Real-time updates come from Ably WebSocket via OrganizationSidebarWrapper
  // No polling needed - all updates are real-time

  return (
    <Sidebar className="border-sidebar-border/20 bg-transparent text-sidebar-foreground flex h-full flex-col">
      <SidebarHeader className="p-3 pb-2 md:p-4">
        <div className="text-card-foreground flex min-h-[4.5rem] w-full min-w-0 items-center gap-3 rounded-2xl bg-card px-3 py-3">
          <div className="flex-shrink-0">
            <Avatar className="h-11 w-11 rounded-xl shadow-none ring-0">
              <AvatarImage src={orgBrandSrc} alt={organization.name} className="object-contain p-1.5" />
              <AvatarFallback className="rounded-xl bg-primary/18 text-lg font-bold text-primary">
                {organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1 py-0.5 text-left">
            <p className="text-foreground line-clamp-2 break-words text-sm font-semibold leading-snug tracking-tight">
              {organization.name}
            </p>
            <p className="text-muted-foreground/80 mt-0.5 text-[11px] font-medium">Organization</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 px-3">
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="text-muted-foreground/80 mx-2 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {sidebarItems.map((item) => {
                const isItemActive = isActive(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={`group relative rounded-lg p-2 transition-colors ${
                        isItemActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full min-w-0">
                        <div className={`p-2 rounded-md transition-colors flex-shrink-0 ${
                          isItemActive 
                            ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                            : "bg-muted text-muted-foreground group-hover:text-foreground"
                        }`}>
                          <item.icon className={`h-4 w-4 transition-colors ${
                            isItemActive ? "text-sidebar-primary-foreground" : "text-current"
                          }`} />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {item.badge !== undefined && (
                          <Badge 
                            variant="secondary" 
                            className={`ml-auto h-5 min-w-[20px] flex-shrink-0 px-1.5 text-xs font-medium ${
                              isLoading ? "animate-pulse bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {isLoading ? "..." : item.badge}
                          </Badge>
                        )}
                        {isItemActive && (
                          <div className="bg-sidebar-primary h-2 w-2 rounded-full" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="text-muted-foreground/80 mx-2 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {managementItems.map((item) => {
                const isItemActive = isActive(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={`group rounded-lg p-2 transition-colors ${
                        isItemActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full min-w-0">
                        <div className={`p-2 rounded-md transition-colors flex-shrink-0 ${
                          isItemActive 
                            ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                            : "bg-muted text-muted-foreground group-hover:text-foreground"
                        }`}>
                          <item.icon className={`h-4 w-4 transition-colors ${
                            isItemActive ? "text-sidebar-primary-foreground" : "text-current"
                          }`} />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {isItemActive && (
                          <div className="bg-sidebar-primary h-2 w-2 rounded-full" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}