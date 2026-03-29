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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Building2, CreditCard, FileText, Globe, HelpCircle, LayoutDashboard, Settings, Users, ChevronDown, Mail, MessageCircle, Gauge, Receipt } from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

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

interface Website {
  id: string
  name: string
  domain: string
  organization_id: string
  analytics: boolean
  created_at: string
  updated_at: string
}

export function OrganizationSidebar({
  organization,
  initialUnseenFormsCount = 0,
  initialUnreadEmailsCount = 0,
  initialUnreadWhatsappCount = 0,
  initialEmailsEnabled = false,
  initialWhatsappEnabled = false,
  initialAnalyticsEnabled = false,
  initialBlogsEnabled = false,
  initialInvoicesEnabled = false,
  isLoading: externalIsLoading = false,
}: {
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
  isLoading?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
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

  // Extract slug from current path or use organization id as fallback
  const pathSegments = pathname?.split('/').filter(Boolean) || []
  const slug = pathSegments[0] || organization.id

  const sidebarItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: `/${slug}/dashboard` },
    ...(analyticsEnabled ? [{ title: "Analytics", icon: Globe, href: `/${slug}/analytics` }] : []),
    { title: "Site Audits", icon: Gauge, href: `/${slug}/audits` },
    { 
      title: "Forms", 
      icon: FileText, 
      href: `/${slug}/forms`,
      badge: unseenFormsCount > 0 ? unseenFormsCount : undefined
    },
    ...(blogsEnabled ? [{ title: "Blog", icon: BookOpen, href: `/${slug}/blogs` }] : []),
    ...(emailsEnabled ? [{
      title: "Emails",
      icon: Mail,
      href: `/${slug}/emails`,
      badge: unreadEmailsCount > 0 ? unreadEmailsCount : undefined
    }] : []),
    ...(whatsappEnabled ? [{
      title: "WhatsApp",
      icon: MessageCircle,
      href: `/${slug}/whatsapp`,
      badge: unreadWhatsappCount > 0 ? unreadWhatsappCount : undefined
    }] : []),
    ...(invoicesEnabled ? [{ title: "Invoices", icon: Receipt, href: `/${slug}/invoices` }] : []),
    { title: "Team", icon: Users, href: `/${slug}/team` },
    { title: "Settings", icon: Settings, href: `/${slug}/settings` },
  ]

  const managementItems = [
    { title: "Billing", icon: CreditCard, href: `/${slug}/billing` },
    { title: "Reports", icon: FileText, href: `/${slug}/reports` },
    { title: "Support", icon: HelpCircle, href: `/${slug}/support` },
  ]

  const isActive = (href: string) => pathname?.startsWith(href)

  // Real-time updates come from Ably WebSocket via OrganizationSidebarWrapper
  // No polling needed - all updates are real-time

  return (
    <Sidebar className="border-r border-border/50 bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 flex flex-col h-full">
      <SidebarHeader className="p-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full hover:bg-muted/60 p-4 rounded-2xl min-h-[72px] group border border-border/20 hover:border-border/40 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <div className="flex-shrink-0">
                      <Avatar className="h-11 w-11 ring-2 ring-primary/20 transition-all duration-200 group-hover:ring-primary/40 shadow-lg">
                        <AvatarImage 
                          src={organization.logo || ""} 
                          alt={organization.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white font-bold text-lg">
                          {organization.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0 text-left py-0.5">
                      <p className="font-bold text-foreground text-sm leading-snug line-clamp-2 break-words">
                        {organization.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Organization
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-popper-anchor-width] min-w-[240px]" align="start">
                <DropdownMenuItem onClick={() => router.push("/dashboard")} className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Switch Organization
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/${slug}/settings`)} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Organization Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
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