"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/client"
import LoadingAnimation from "@/components/LoadingAnimation"
import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth/client"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Building2,
  LayoutDashboard,
  Users,
  Globe,
  Settings,
  BarChart3,
  FileText,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Menu,
  Bell,
  Shield,
  Crown,
  Activity,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import NotificationBell from "@/components/NotificationBell"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
    } else if (!isPending && session && (session.user as { role?: string }).role !== "admin") {
      router.push("/dashboard")
    }
  }, [session, isPending, router])

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = "/sign-in"
  }

  // Loading state
  if (isPending) {
    return <LoadingAnimation />
  }

  // Not authenticated or not admin
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              You need admin privileges to access this area.
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Back to Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push("/sign-in")} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mobile Menu Component
  const MobileMenu = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="md:hidden p-2 h-9 w-9 hover:bg-muted/50"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <Crown className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Admin Panel</p>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200" variant="secondary">
                  Admin
                </Badge>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Admin Dashboard
                </h4>
                <div className="space-y-1">
                  {[
                    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
                    { title: "Users", icon: Users, href: "/users" },
                    { title: "Organizations", icon: Building2, href: "/organizations" },
                    { title: "Analytics", icon: BarChart3, href: "/analytics" },
                    { title: "Settings", icon: Settings, href: "/settings" },
                  ].map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 font-normal"
                      onClick={() => {
                        router.push(item.href)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.title}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Management
                </h4>
                <div className="space-y-1">
                  {[
                    { title: "Revenue", icon: DollarSign, href: "/revenue" },
                    { title: "Reports", icon: FileText, href: "/reports" },
                    { title: "Support", icon: HelpCircle, href: "/support" },
                  ].map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 font-normal"
                      onClick={() => {
                        router.push(item.href)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.title}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="p-4 border-t border-border/50">
            <Button
              variant="ghost"
              className="w-full justify-start p-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                handleSignOut()
                setIsMobileMenuOpen(false)
              }}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AdminSidebar
            sessionUser={{ name: session?.user?.name, image: session?.user?.image }}
            onSignOut={handleSignOut}
          />
        </div>

        <SidebarInset className="flex-1">
          {/* Enhanced Responsive Header */}
          <header className="sticky top-0 z-50 flex h-14 md:h-16 shrink-0 items-center gap-2 border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 md:px-6 shadow-sm">
            {/* Desktop Sidebar Trigger */}
            <SidebarTrigger className="hidden md:flex -ml-1 hover:bg-muted/50 rounded-lg" />

            {/* Mobile Menu Trigger */}
            <MobileMenu />

            {/* Brand Section */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 bg-primary/10 rounded-md flex-shrink-0">
                <Crown className="h-3 w-3 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground text-xs truncate">
                  made by Luminum Agency
                </span>
              </div>
            </div>

            {/* Admin Info - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 ml-4 min-w-0">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Shield className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm text-muted-foreground truncate max-w-32 lg:max-w-none">
                System Administration
              </span>
            </div>

            {/* Right Section */}
            <div className="ml-auto flex items-center gap-1 md:gap-3">
              {/* Theme Toggle - Hidden on small mobile */}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* Notifications */}
              <div className="relative">
                <NotificationBell />
              </div>

              {/* Admin Badge - Hidden on mobile */}
              <Badge 
                className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200 hidden md:inline-flex text-xs" 
                variant="secondary"
              >
                Admin
              </Badge>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1 md:gap-2 hover:bg-muted/50 h-8 md:h-9 px-2 md:px-3"
                  >
                    <Avatar className="h-5 w-5 md:h-6 md:w-6">
                      <AvatarImage src={session?.user?.image || ""} />
                      <AvatarFallback className="text-xs">
                        {session?.user?.name?.charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium truncate max-w-24 lg:max-w-none">
                      {session?.user?.name}
                    </span>
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Mobile-only items */}
                  <div className="md:hidden">
                    <DropdownMenuItem className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <Shield className="h-2 w-2 text-white" />
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        System Administration
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="justify-center">
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200" variant="secondary">
                        Admin
                      </Badge>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="sm:hidden">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Theme Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="sm:hidden" />
                  </div>

                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Switch to Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-3 md:p-6 bg-background/50">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
