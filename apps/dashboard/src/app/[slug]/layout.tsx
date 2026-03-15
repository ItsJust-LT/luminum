"use client"

import type React from "react"

import { useParams, useRouter } from "next/navigation"
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Building2,
  LayoutDashboard,
  Users,
  Globe,
  Settings,
  FileText,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Menu,
  Mail,
} from "lucide-react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { OrganizationProvider } from "@/lib/contexts/organization-context"
import { EmailsProvider } from "@/lib/contexts/emails-context"
import { OrganizationSidebarWrapper } from "@/components/organization/organization-sidebar-wrapper"
import NotificationBell from "@/components/NotificationBell"
import { api } from "@/lib/api"
import { UserNotificationProvider } from "@/components/realtime/user-notification-provider"
import { useDisplayMode } from "@/lib/hooks/use-display-mode"
import { AppShellLayout } from "@/components/app-shell/app-shell-layout"

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: any
  createdAt: string | Date
  members?: any[]
  role?: string
  emails_enabled?: boolean
}

interface LayoutState {
  organization: Organization | null
  loading: boolean
  error: string | null
  userRole: string | null
  sidebarData: {
    unseenFormsCount: number
    unreadEmailsCount: number
    emailsEnabled: boolean
  } | null
}

export default function SlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [state, setState] = useState<LayoutState>({
    organization: null,
    loading: true,
    error: null,
    userRole: null,
    sidebarData: null,
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isStandalone, isReady } = useDisplayMode()

  const slug = params.slug as string

  useEffect(() => {
    if (!isPending && session) {
      if (state.organization && state.organization.slug === slug) {
        return
      }
      validateOrganizationAccess(false)
    } else if (!isPending && !session) {
      router.push("/sign-in")
    }
  }, [session, isPending, slug])

  const validateOrganizationAccess = async (force = false) => {
    try {
      setState((prev) => ({ ...prev, loading: force ? true : !prev.organization, error: null }))

      // First, get all organizations the user has access to
      const orgApi = (authClient as unknown as { organization: { list: () => Promise<{ data?: Array<{ id?: string; slug?: string }>; error?: { message?: string } }>; getFullOrganization: (opts?: { query?: { organizationId?: string; organizationSlug?: string; membersLimit?: number } }) => Promise<{ data?: unknown; error?: { message?: string } }> } }).organization
      const orgsResult = await orgApi.list()

      if (orgsResult.error) {
        throw new Error(orgsResult.error.message || "Failed to fetch organizations")
      }

      if (!orgsResult.data || orgsResult.data.length === 0) {
        // If user isn't a member of any orgs, allow admins to resolve org by slug
        const isAdmin = (session?.user as { role?: string })?.role === "admin" || (session?.user as { role?: string })?.role?.includes?.("admin")
        if (!isAdmin) {
          setState({
            organization: null,
            loading: false,
            error: "You don't have access to any organizations",
            userRole: null,
            sidebarData: null,
          })
          return
        }
      }

      // Find the organization by slug (from orgs user is a member of)
      let targetOrg = orgsResult.data?.find?.((org) => org.slug === slug)
      let adminOrgData: { organization: any; members: any[] } | null = null

      if (!targetOrg) {
        const isAdmin = (session?.user as { role?: string })?.role === "admin" || (session?.user as { role?: string })?.role?.includes?.("admin")
        if (isAdmin) {
          const adminRes = await api.get("/api/admin/organizations/by-slug", { slug })
          const data = adminRes as { organization?: any; members?: any[] }
          if (data?.organization) {
            targetOrg = data.organization
            adminOrgData = {
              organization: data.organization,
              members: data.members ?? data.organization?.members ?? [],
            }
          } else {
            setState({
              organization: null,
              loading: false,
              error: "Organization not found",
              userRole: null,
              sidebarData: null,
            })
            return
          }
        } else {
          setState({
            organization: null,
            loading: false,
            error: "Organization not found or you don't have access to it",
            userRole: null,
            sidebarData: null,
          })
          return
        }
      }

      // Get detailed organization information (skip if we already have it from admin API)
      let orgData: { organization: any; members: any[] }
      if (adminOrgData) {
        orgData = adminOrgData
      } else {
        const orgDetailsResult = await orgApi.getFullOrganization({
          query: {
            organizationId: targetOrg!.id,
            organizationSlug: slug,
            membersLimit: 200,
          },
        })
        if (orgDetailsResult.error) {
          throw new Error(orgDetailsResult.error.message || "Failed to fetch organization details")
        }
        orgData = (orgDetailsResult.data as any) || {}
      }

      const organization = orgData.organization || targetOrg
      const members = orgData.members || []

      // Fetch emails_enabled from API
      let emailsEnabled = false
      try {
        const res = await api.organizationSettings.getEmailsEnabled(organization.id)
        emailsEnabled = res?.enabled ?? false
      } catch (error) {
        console.error("Failed to fetch emails_enabled:", error)
      }

      // Find the current user's membership
      const userMembership = members.find(
        (member: any) => member.user?.id === session?.user?.id || member.userId === session?.user?.id,
      )

      if (!userMembership) {
        // Allow admins to access any organization's dashboard
        const isAdmin = (session?.user as { role?: string })?.role === "admin" || (session?.user as { role?: string })?.role?.includes?.("admin")
        if (!isAdmin) {
          setState({
            organization: null,
            loading: false,
            error: "You don't have access to this organization",
            userRole: null,
            sidebarData: null,
          })
          return
        }
      }

      const isAdmin = (session?.user as { role?: string })?.role === "admin" || (session?.user as { role?: string })?.role?.includes?.("admin")
      const resolvedRole = userMembership?.role || (isAdmin ? "admin" : undefined)
      
      // Fetch sidebar data server-side in parallel for better performance
      // These are cached at the request level, so multiple calls in the same request are deduplicated
      const [unseenFormsResult, unreadEmailsResult] = await Promise.all([
        api.forms.getUnseenCount(organization.id),
        emailsEnabled ? api.emails.getUnreadCount(organization.id) : Promise.resolve({ success: true, count: 0 }),
      ])
      
      setState({
        organization: {
          ...organization,
          createdAt:
            typeof organization.createdAt === "string" ? organization.createdAt : organization.createdAt.toISOString(),
          members,
          role: resolvedRole,
          emails_enabled: emailsEnabled,
        },
        loading: false,
        error: null,
        userRole: resolvedRole || null,
        sidebarData: {
          unseenFormsCount: unseenFormsResult.success ? unseenFormsResult.count : 0,
          unreadEmailsCount: unreadEmailsResult.success ? unreadEmailsResult.count : 0,
          emailsEnabled,
        },
      })
    } catch (error: any) {
      console.error("Error validating organization access:", error)
      setState({
        organization: null,
        loading: false,
        error: error.message || "Failed to validate organization access",
        userRole: null,
        sidebarData: null,
      })
    }
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = "/sign-in"
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 dark:from-violet-950/50 dark:to-purple-950/50 dark:text-violet-300 ring-1 ring-violet-200/50 dark:ring-violet-800/30"
      case "admin":
        return "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 dark:from-slate-900/50 dark:to-gray-900/50 dark:text-slate-300 ring-1 ring-slate-200/50 dark:ring-slate-700/30"
      case "member":
        return "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 dark:from-emerald-950/50 dark:to-green-950/50 dark:text-emerald-300 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30"
      default:
        return "bg-muted/50 text-muted-foreground ring-1 ring-border/30"
    }
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
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src={state.organization?.logo || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                  {state.organization?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{state.organization?.name}</p>
                <Badge className={getRoleColor(state.userRole || "member")} variant="secondary" style={{ textTransform: "capitalize" }}>
                  {(state.userRole || "member").replace(/^./, (c) => c.toUpperCase())}
                </Badge>
              </div>
            </div>
          </div>

          {/* Mobile Navigation - Match Desktop Sidebar */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Navigation
                </h4>
                <div className="space-y-1">
                  {[
                    {
                      title: "Dashboard",
                      icon: LayoutDashboard,
                      href: `/${slug}/dashboard`,
                    },
                    { title: "Analytics", icon: Globe, href: `/${slug}/analytics` },
                    { title: "Forms", icon: FileText, href: `/${slug}/forms` },
                    ...((state.organization as any)?.emails_enabled ? [{ title: "Emails", icon: Mail, href: `/${slug}/emails` }] : []),
                    { title: "Team", icon: Users, href: `/${slug}/team` },
                    { title: "Settings", icon: Settings, href: `/${slug}/settings` },
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
                    {
                      title: "Billing",
                      icon: CreditCard,
                      href: `/${slug}/billing`,
                    },
                    { title: "Reports", icon: FileText, href: `/${slug}/reports` },
                    { title: "Support", icon: HelpCircle, href: `/${slug}/support` },
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

  // Loading state
  if (isPending || state.loading) {
    return <LoadingAnimation />
  }

  // Error state
  if (state.error || !state.organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4 text-sm">{state.error}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Back to Organizations
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

  // PWA standalone: app shell with bottom tab bar (no sidebar)
  if (isReady && isStandalone) {
    return (
      <OrganizationProvider
        organization={state.organization}
        userRole={state.userRole}
        loading={state.loading}
        error={state.error}
        onRefresh={validateOrganizationAccess}
      >
        <UserNotificationProvider>
          <EmailsProvider>
            <AppShellLayout
              slug={slug}
              organizationName={state.organization.name}
              organizationLogo={state.organization.logo}
              emailsEnabled={state.organization.emails_enabled ?? false}
              userRole={state.userRole ?? "member"}
              sessionUser={{
                name: session?.user?.name,
                image: session?.user?.image,
                email: session?.user?.email,
              }}
              onSignOut={handleSignOut}
            >
              {children}
            </AppShellLayout>
          </EmailsProvider>
        </UserNotificationProvider>
      </OrganizationProvider>
    )
  }

  return (
    <OrganizationProvider
      organization={state.organization}
      userRole={state.userRole}
      loading={state.loading}
      error={state.error}
      onRefresh={validateOrganizationAccess}
    >
      <UserNotificationProvider>
        <EmailsProvider>
        <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <OrganizationSidebarWrapper
              organization={{
                id: state.organization.id,
                name: state.organization.name,
                logo: state.organization.logo || null,
                emails_enabled: state.organization.emails_enabled ?? false,
              }}
              sessionUser={{ name: session?.user?.name, image: session?.user?.image }}
              onSignOut={handleSignOut}
              initialUnseenFormsCount={state.sidebarData?.unseenFormsCount ?? 0}
              initialUnreadEmailsCount={state.sidebarData?.unreadEmailsCount ?? 0}
              initialEmailsEnabled={state.sidebarData?.emailsEnabled ?? false}
            />
          </div>

          <SidebarInset className="flex-1">
            {/* Enhanced Responsive Header */}
            <header className="sticky top-0 z-50 flex h-16 md:h-18 shrink-0 items-center gap-3 md:gap-4 border-b border-border/40 bg-background/98 backdrop-blur-md px-4 md:px-8 shadow-sm transition-all duration-200">
              {/* Desktop Sidebar Trigger */}
              <SidebarTrigger className="hidden md:flex -ml-1 hover:bg-muted/60 rounded-xl p-2 transition-colors duration-200" />

              {/* Mobile Menu Trigger */}
              <MobileMenu />

              {/* Enhanced Brand Section */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl flex-shrink-0 ring-1 ring-primary/10">
                  <Image
                    src="/images/logo.png"
                    alt="Luminum"
                    width={20}
                    height={20}
                    className="h-4 w-4 md:h-5 md:w-5"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-foreground text-sm md:text-base tracking-tight truncate">
                    Luminum Agency
                  </span>
                  <span className="text-xs text-muted-foreground/80 font-medium hidden sm:block">Dashboard</span>
                </div>
              </div>

             

              {/* Right Section */}
              <div className="ml-auto flex items-center gap-2 md:gap-4">
                <div className="hidden sm:block">
                  <div className="p-1 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                    <ThemeToggle />
                  </div>
                </div>

                <div className="relative">
                  <div className="p-1 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                    <NotificationBell />
                  </div>
                </div>

                <Badge
                  className={`${getRoleColor(state.userRole || "member")} hidden md:inline-flex text-xs font-medium px-3 py-1 rounded-full border-0 shadow-sm capitalize`}
                  variant="secondary"
                >
                  {(state.userRole || "member").replace(/^./, (c) => c.toUpperCase())}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 md:gap-3 hover:bg-muted/60 h-10 md:h-11 px-3 md:px-4 rounded-xl transition-all duration-200 border border-transparent hover:border-border/50"
                    >
                      <Avatar className="h-7 w-7 md:h-8 md:w-8 ring-2 ring-background shadow-sm">
                        <AvatarImage src={session?.user?.image || ""} />
                        <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                          {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col items-start min-w-0 max-w-[180px] md:max-w-[240px]">
                        <span className="text-sm font-semibold text-foreground truncate w-full">
                          {session?.user?.name}
                        </span>
                        <span className="text-xs text-muted-foreground/70 truncate w-full" title={session?.user?.email || undefined}>
                          {session?.user?.email}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Mobile-only items */}
                    <div className="md:hidden">
                      <DropdownMenuItem className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={state.organization?.logo || ""} />
                          <AvatarFallback className="text-xs">
                            {state.organization?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{state.organization?.name}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="justify-center">
                        <Badge className={getRoleColor(state.userRole || "member")} variant="secondary">
                          {state.userRole || "member"}
                        </Badge>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="sm:hidden">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Theme Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="sm:hidden" />
                    </div>

                    <DropdownMenuItem
                      onClick={() => router.push(`/${slug}/settings`)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>Switch Organization</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-destructive focus:text-destructive flex items-center gap-2"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <main className="flex-1 overflow-auto p-3 md:p-6 bg-background/50">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
        </EmailsProvider>
      </UserNotificationProvider>
    </OrganizationProvider>
  )
}
