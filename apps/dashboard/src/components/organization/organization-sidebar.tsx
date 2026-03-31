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
import { BookOpen, CreditCard, FileText, Globe, HelpCircle, LayoutDashboard, Settings, Users, Mail, MessageCircle, Gauge, Receipt, CalendarClock } from "lucide-react"
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
  if (invoicesEnabled) {
    if (navOk("invoices")) sidebarItems.push({ title: "Invoices", icon: Receipt, href: nav("invoices") })
    if (navOk("invoices/schedules")) sidebarItems.push({ title: "Recurring", icon: CalendarClock, href: nav("invoices/schedules") })
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
    <Sidebar className="border-r border-border/50 bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 flex flex-col h-full">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-3 w-full min-w-0 p-4 rounded-2xl min-h-[72px] border border-border/20 shadow-sm bg-sidebar">
          <div className="flex-shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-primary/20 shadow-lg">
              <AvatarImage src={orgBrandSrc} alt={organization.name} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white font-bold text-lg">
                {organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0 text-left py-0.5">
            <p className="font-bold text-foreground text-sm leading-snug line-clamp-2 break-words">
              {organization.name}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Organization</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 flex-1 overflow-y-auto">
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-3 mb-2 bg-muted/30 rounded-lg mx-2">
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
                      className={`rounded-xl p-3 transition-all duration-200 group relative ${
                        isItemActive 
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/20 shadow-md" 
                          : "hover:bg-muted/50 hover:shadow-sm hover:scale-[1.02]"
                      }`}
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full min-w-0">
                        <div className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                          isItemActive 
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg" 
                            : "bg-muted/30 group-hover:bg-muted/50"
                        }`}>
                          <item.icon className={`h-4 w-4 transition-colors ${
                            isItemActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                          }`} />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {item.badge !== undefined && (
                          <Badge 
                            variant="secondary" 
                            className={`ml-auto flex-shrink-0 h-5 min-w-[20px] px-1.5 text-xs font-medium transition-all ${
                              isLoading ? "animate-pulse bg-muted" : "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                            }`}
                          >
                            {isLoading ? "..." : item.badge}
                          </Badge>
                        )}
                        {isItemActive && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
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
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-3 mb-2 bg-muted/30 rounded-lg mx-2">
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
                      className={`rounded-xl p-3 transition-all duration-200 group ${
                        isItemActive 
                          ? "bg-gradient-to-r from-muted/20 to-muted/10 ring-1 ring-border shadow-sm" 
                          : "hover:bg-muted/50 hover:shadow-sm hover:scale-[1.02]"
                      }`}
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full min-w-0">
                        <div className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                          isItemActive 
                            ? "bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg" 
                            : "bg-muted/20 group-hover:bg-muted/30"
                        }`}>
                          <item.icon className={`h-4 w-4 transition-colors ${
                            isItemActive ? "text-white" : "text-muted-foreground group-hover:text-foreground/80"
                          }`} />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {isItemActive && (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
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