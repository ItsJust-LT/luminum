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
  Settings,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Menu,
  Shield,
  Crown,
  TrendingUp,
  HelpCircle,
  FileText,
  Mail,
  Globe,
  ExternalLink,
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
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
    } else if (!isPending && session && (session.user as { role?: string }).role !== "admin") {
      router.push("/dashboard")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user) {
      authClient.organization.list().then((result) => {
        const data = (result as { data?: Array<{ slug?: string }> })?.data
        if (data && data.length > 0 && data[0]?.slug) {
          setWorkspaceSlug(data[0].slug)
        }
      }).catch(() => {})
    }
  }, [session?.user])

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = "/sign-in"
  }

  if (isPending) {
    return <LoadingAnimation />
  }

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

  const mobileNavItems = [
    { title: "Overview", icon: LayoutDashboard, href: "/admin" },
    { title: "Organizations", icon: Building2, href: "/admin/organizations" },
    { title: "Users", icon: Users, href: "/admin/users" },
    { title: "Platform Analytics", icon: TrendingUp, href: "/admin/analytics" },
    { title: "Forms", icon: FileText, href: "/admin/forms" },
    { title: "Emails", icon: Mail, href: "/admin/emails" },
    { title: "Websites", icon: Globe, href: "/admin/websites" },
    { title: "Support", icon: HelpCircle, href: "/admin/support" },
    { title: "Settings", icon: Settings, href: "/admin/settings" },
  ]

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <AdminSidebar
            sessionUser={{ name: session?.user?.name, image: session?.user?.image }}
            onSignOut={handleSignOut}
            workspaceSlug={workspaceSlug}
          />
        </div>

        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-6">
            <SidebarTrigger className="hidden md:flex -ml-1 hover:bg-muted/50 rounded-lg transition-colors" />

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden p-2 h-9 w-9 hover:bg-muted/50"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Admin Console</p>
                        <p className="text-xs text-muted-foreground">Luminum Platform</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-1">
                      {mobileNavItems.map((item) => (
                        <Button
                          key={item.href}
                          variant="ghost"
                          className="w-full justify-start h-auto p-3 font-medium"
                          onClick={() => {
                            router.push(item.href)
                            setIsMobileMenuOpen(false)
                          }}
                        >
                          <item.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                          {item.title}
                        </Button>
                      ))}
                      {workspaceSlug && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-auto p-3 font-medium"
                          onClick={() => {
                            router.push(`/${workspaceSlug}/dashboard`)
                            setIsMobileMenuOpen(false)
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-3 text-muted-foreground" />
                          My Workspace
                        </Button>
                      )}
                    </div>
                  </div>
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

            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs px-2 py-0.5 hidden sm:inline-flex">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-muted/50 h-9 px-2 md:px-3 transition-all duration-200"
                  >
                    <Avatar className="h-7 w-7 md:h-8 md:w-8 ring-2 ring-primary/10">
                      <AvatarImage src={session?.user?.image || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xs">
                        {session?.user?.name?.charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium truncate max-w-24 lg:max-w-none">
                      {session?.user?.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push("/account/settings")} className="gap-2">
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/dashboard")} className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Switch to Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
