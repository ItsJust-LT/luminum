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
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex h-full flex-col">
      <SidebarHeader className="p-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:bg-sidebar-accent w-full rounded-lg border p-4 transition-colors">
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <div className="flex-shrink-0">
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground grid h-11 w-11 place-items-center rounded-lg">
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
          <SidebarGroupLabel className="text-muted-foreground mx-2 mb-2 rounded-md bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wider">
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
                      className={`group relative rounded-lg p-2 transition-colors ${
                        isItemActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 w-full min-w-0"
                      >
                        <div
                          className={`p-2 rounded-md transition-colors flex-shrink-0 ${
                            isItemActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          <item.icon
                              className={`h-4 w-4 transition-colors ${isItemActive ? "text-sidebar-primary-foreground" : "text-current"}`}
                          />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {"badge" in item && item.badge !== undefined && (
                          <Badge
                            variant="secondary"
                            className="bg-primary text-primary-foreground ml-auto h-5 min-w-[20px] flex-shrink-0 px-1.5 text-xs font-medium"
                          >
                            {item.badge}
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
          <SidebarGroupLabel className="text-muted-foreground mx-2 mb-2 rounded-md bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wider">
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
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 w-full min-w-0"
                      >
                        <div
                          className={`p-2 rounded-md transition-colors flex-shrink-0 ${
                            isItemActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          <item.icon
                              className={`h-4 w-4 transition-colors ${isItemActive ? "text-sidebar-primary-foreground" : "text-current"}`}
                          />
                        </div>
                        <span className="font-semibold flex-1 text-left truncate text-sm">
                          {item.title}
                        </span>
                        {"badge" in item && item.badge !== undefined && (
                          <Badge
                            variant="secondary"
                            className="bg-primary text-primary-foreground ml-auto h-5 min-w-[20px] flex-shrink-0 px-1.5 text-xs font-medium"
                          >
                            {item.badge}
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

              {workspaceSlug && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="group rounded-lg p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Link
                      href={`/${workspaceSlug}/dashboard`}
                      className="flex items-center gap-3 w-full min-w-0"
                    >
                      <div className="bg-muted text-muted-foreground group-hover:text-foreground flex-shrink-0 rounded-md p-2 transition-colors">
                        <ExternalLink className="h-4 w-4 transition-colors text-current" />
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
