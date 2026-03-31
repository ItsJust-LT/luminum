"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import {
  Activity,
  Building2,
  ChevronDown,
  Database,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Users,
  Crown,
  TrendingUp,
  HelpCircle,
  FileText,
  Mail,
  Globe,
  ExternalLink,
  Server,
  FileText as LogsIcon,
  Terminal,
  Receipt,
} from "lucide-react"

interface AdminSidebarProps {
  sessionUser?: { name?: string | null; image?: string | null }
  onSignOut: () => Promise<void> | void
  openTickets?: number
  unseenForms?: number
  workspaceSlug?: string | null
}

export function AdminSidebar({
  sessionUser,
  onSignOut,
  openTickets = 0,
  unseenForms = 0,
  workspaceSlug,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navigationItems = [
    { title: "Overview", href: "/admin", icon: LayoutDashboard },
    { title: "Organizations", href: "/admin/organizations", icon: Building2 },
    { title: "Users", href: "/admin/users", icon: Users },
    {
      title: "Platform Analytics",
      href: "/admin/analytics",
      icon: TrendingUp,
    },
    {
      title: "Forms",
      href: "/admin/forms",
      icon: FileText,
      badge: unseenForms > 0 ? unseenForms : undefined,
    },
    { title: "Emails", href: "/admin/emails", icon: Mail },
    { title: "Websites", href: "/admin/websites", icon: Globe },
    { title: "User Activity", href: "/admin/activity", icon: Activity },
    { title: "WhatsApp", href: "/admin/whatsapp", icon: MessageCircle },
    { title: "Invoices", href: "/admin/invoices", icon: Receipt },
    { title: "Server Monitoring", href: "/admin/monitoring", icon: Server },
    { title: "System Logs", href: "/admin/logs", icon: LogsIcon },
    { title: "Database", href: "/admin/database", icon: Database },
    { title: "Environment", href: "/admin/environment", icon: Terminal },
  ]

  const managementItems = [
    {
      title: "Support",
      href: "/admin/support",
      icon: HelpCircle,
      badge: openTickets > 0 ? openTickets : undefined,
    },
    { title: "Platform settings", href: "/admin/settings", icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    if (href === "/admin/settings")
      return (
        (pathname === "/admin/settings" || pathname === "/admin/settings/") &&
        !pathname?.startsWith("/admin/settings/organization")
      )
    return pathname?.startsWith(href)
  }

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
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 grid place-items-center text-white ring-2 ring-blue-500/20 shadow-lg group-hover:ring-blue-500/40 transition-all duration-200">
                        <Crown className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left py-0.5">
                      <p className="font-bold text-foreground text-sm leading-snug">
                        Admin Console
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Luminum Platform
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-popper-anchor-width] min-w-[240px]"
                align="start"
              >
                <DropdownMenuItem
                  onClick={() => router.push("/admin")}
                  className="gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Overview
                </DropdownMenuItem>
                {workspaceSlug && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/${workspaceSlug}/dashboard`)
                      }
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      My Workspace
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard")}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Switch to Dashboard
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
              {navigationItems.map((item) => {
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
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 w-full min-w-0"
                      >
                        <div
                          className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                            isItemActive
                              ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg"
                              : "bg-muted/30 group-hover:bg-muted/50"
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 transition-colors ${
                              isItemActive
                                ? "text-white"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {"badge" in item && item.badge !== undefined && (
                          <Badge
                            variant="secondary"
                            className="ml-auto flex-shrink-0 h-5 min-w-[20px] px-1.5 text-xs font-medium bg-gradient-to-r from-orange-500 to-red-500 text-white"
                          >
                            {item.badge}
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
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 w-full min-w-0"
                      >
                        <div
                          className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                            isItemActive
                              ? "bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg"
                              : "bg-muted/20 group-hover:bg-muted/30"
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 transition-colors ${
                              isItemActive
                                ? "text-white"
                                : "text-muted-foreground group-hover:text-foreground/80"
                            }`}
                          />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {"badge" in item && item.badge !== undefined && (
                          <Badge
                            variant="secondary"
                            className="ml-auto flex-shrink-0 h-5 min-w-[20px] px-1.5 text-xs font-medium bg-gradient-to-r from-orange-500 to-red-500 text-white"
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {isItemActive && (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

              {workspaceSlug && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="rounded-xl p-3 transition-all duration-200 group hover:bg-muted/50 hover:shadow-sm hover:scale-[1.02]"
                  >
                    <Link
                      href={`/${workspaceSlug}/dashboard`}
                      className="flex items-center gap-3 w-full min-w-0"
                    >
                      <div className="p-2 rounded-lg transition-all duration-200 flex-shrink-0 bg-muted/20 group-hover:bg-muted/30">
                        <ExternalLink className="h-4 w-4 transition-colors text-muted-foreground group-hover:text-foreground/80" />
                      </div>
                      <span className="font-semibold flex-1 text-left truncate text-sm">
                        My Workspace
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
