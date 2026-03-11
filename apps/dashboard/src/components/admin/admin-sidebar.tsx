"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  ChevronDown, 
  LayoutDashboard, 
  Settings, 
  Users, 
  LogOut, 
  Shield, 
  Crown, 
  Activity, 
  TrendingUp,
  HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminSidebar({
  sessionUser,
  onSignOut,
}: {
  sessionUser?: { name?: string | null; image?: string | null }
  onSignOut: () => Promise<void> | void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const items = [
    { 
      title: "Overview", 
      href: "/dashboard", 
      icon: LayoutDashboard, 
      color: "from-blue-500 to-blue-600",
      description: "Dashboard overview"
    },
    { 
      title: "Organizations", 
      href: "/admin/organizations", 
      icon: Building2, 
      color: "from-purple-500 to-purple-600",
      description: "Manage organizations"
    },
    { 
      title: "Users", 
      href: "/admin/users", 
      icon: Users, 
      color: "from-green-500 to-green-600",
      description: "User management"
    },
    { 
      title: "Analytics", 
      href: "/admin/reports", 
      icon: TrendingUp, 
      color: "from-orange-500 to-orange-600",
      description: "Reports & analytics"
    },
    { 
      title: "Support", 
      href: "/admin/support", 
      icon: HelpCircle, 
      color: "from-red-500 to-red-600",
      description: "Support tickets"
    },
    { 
      title: "Settings", 
      href: "/admin/settings", 
      icon: Settings, 
      color: "from-gray-500 to-gray-600",
      description: "System settings"
    },
  ]

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <Sidebar className="border-r border-border/50 bg-gradient-to-b from-background via-background to-background/95 backdrop-blur-xl">
      <SidebarHeader className="p-4 pb-3 border-b border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full hover:bg-muted/60 p-3 rounded-xl transition-all duration-200 group border border-border/20 hover:border-border/40 hover:shadow-md">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 grid place-items-center text-white ring-2 ring-blue-500/20 shadow-lg group-hover:ring-blue-500/40 transition-all duration-200">
                      <Crown className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold truncate text-foreground text-sm">Admin Console</p>
                      <p className="text-xs text-muted-foreground font-medium truncate">Luminum Platform</p>
                    </div>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-popper-anchor-width] min-w-[240px]" align="start">
                <DropdownMenuItem onClick={() => router.push("/dashboard")} className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Overview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/")} className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Go to App Home
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 flex-1 overflow-y-auto py-4">
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-2 mb-2 bg-muted/30 rounded-lg mx-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const isItemActive = isActive(item.href)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "rounded-lg p-3 transition-all duration-200 group relative h-auto",
                        isItemActive 
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/20 shadow-sm" 
                          : "hover:bg-muted/50 hover:shadow-sm"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full min-w-0">
                        <div className={cn(
                          "p-2 rounded-lg transition-all duration-200 flex-shrink-0",
                          isItemActive 
                            ? `bg-gradient-to-br ${item.color} shadow-md` 
                            : "bg-muted/30 group-hover:bg-muted/50"
                        )}>
                          <Icon className={cn(
                            "h-4 w-4 transition-colors",
                            isItemActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold flex-1 text-left truncate text-sm block">
                            {item.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate block">
                            {item.description}
                          </span>
                        </div>
                        {isItemActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
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

      <SidebarFooter className="p-3 mt-auto border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:bg-muted/50 p-3 rounded-xl group min-h-[60px] border border-border/20 hover:border-border/40 transition-all duration-200">
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
                      <AvatarImage src={sessionUser?.image || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xs">
                        {sessionUser?.name?.charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-semibold truncate block leading-tight">
                        {sessionUser?.name || "Admin User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">Administrator</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-popper-anchor-width] min-w-[200px]" side="top" align="start">
                <DropdownMenuItem onClick={() => router.push("/admin/settings")} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSignOut()} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
