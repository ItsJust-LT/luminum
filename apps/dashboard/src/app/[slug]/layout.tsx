"use client"

import type React from "react"

import { useParams, useRouter, usePathname } from "next/navigation"
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
import { Building2, Settings, LogOut, ChevronDown, AlertTriangle, Menu } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { OrganizationProvider } from "@/lib/contexts/organization-context"
import { EmailsProvider } from "@/lib/contexts/emails-context"
import { OrganizationSidebarWrapper } from "@/components/organization/organization-sidebar-wrapper"
import NotificationBell from "@/components/NotificationBell"
import { api } from "@/lib/api"
import { getAllGrantablePermissionsSet } from "@luminum/org-permissions"
import { OrgRouteGuard } from "@/components/organization/org-route-guard"
import type { OrganizationRoleDisplay } from "@/lib/contexts/organization-context"
import { UserNotificationProvider } from "@/components/realtime/user-notification-provider"
import { usePreferAppShell } from "@/lib/hooks/use-prefer-app-shell"
import { mobileManagementNavItems, mobilePrimaryNavItems } from "@/lib/org-mobile-nav"
import { AppShellLayout } from "@/components/app-shell/app-shell-layout"
import { cn } from "@/lib/utils"
import { CustomDomainCtx, type CustomDomainContext } from "@/lib/hooks/use-custom-domain"
import { orgNavPath } from "@/lib/org-nav-path"
import { orgLogoOrBrandProxy } from "@/lib/org-display-logo"
import { MainContentMotion } from "@/components/motion/main-content-motion"

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
  whatsapp_enabled?: boolean
  analytics_enabled?: boolean
  blogs_enabled?: boolean
  invoices_enabled?: boolean
}

interface LayoutState {
  organization: Organization | null
  loading: boolean
  error: string | null
  userRole: string | null
  permissionSet: Set<string>
  permissionsReady: boolean
  organizationRole: OrganizationRoleDisplay | null
  organizationRoleId: string | null
  sidebarData: {
    unseenFormsCount: number
    unreadEmailsCount: number
    unreadWhatsappCount: number
    emailsEnabled: boolean
    whatsappEnabled: boolean
    analyticsEnabled: boolean
    blogsEnabled: boolean
    invoicesEnabled: boolean
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
  const pathname = usePathname()
  const [state, setState] = useState<LayoutState>({
    organization: null,
    loading: true,
    error: null,
    userRole: null,
    permissionSet: new Set(),
    permissionsReady: false,
    organizationRole: null,
    organizationRoleId: null,
    sidebarData: null,
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { preferAppShell, isReady } = usePreferAppShell()

  const slug = params.slug as string

  const isCustomDomain = typeof window !== "undefined"
    ? !["localhost", "127.0.0.1", new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname].includes(window.location.hostname)
    : false

  const flatRoutes = isCustomDomain

  const customDomainCtx: CustomDomainContext = {
    isCustomDomain,
    orgSlug: isCustomDomain ? slug : null,
    orgName: isCustomDomain ? (state.organization?.name ?? null) : null,
    orgLogo: isCustomDomain ? (state.organization?.logo ?? null) : null,
    orgId: isCustomDomain ? (state.organization?.id ?? null) : null,
  }
  const whatsappNavPath = orgNavPath(slug, flatRoutes, "whatsapp")
  const isWhatsappRoute =
    pathname === whatsappNavPath || (pathname?.startsWith(`${whatsappNavPath}/`) ?? false)
  const emailsNavPath = orgNavPath(slug, flatRoutes, "emails")
  const isMailRoute =
    pathname === emailsNavPath || (pathname?.startsWith(`${emailsNavPath}/`) ?? false)

  useEffect(() => {
    if (!isPending && session) {
      if (state.organization && state.organization.slug === slug) {
        // Same org already loaded: refetch feature flags so sidebar stays in sync (e.g. after admin enables analytics)
        const orgId = state.organization.id
        Promise.all([
          api.organizationSettings.getEmailsEnabled(orgId),
          api.whatsapp.checkEnabled(orgId).catch(() => ({ enabled: false })),
          api.organizationSettings.getAnalyticsEnabled(orgId).catch(() => ({ enabled: false })),
          api.organizationSettings.getBlogsEnabled(orgId).catch(() => ({ enabled: false })),
          api.organizationSettings.getInvoicesEnabled(orgId).catch(() => ({ enabled: false })),
          api.members.getAccess(orgId).catch(() => null),
        ]).then(([emailRes, waRes, analyticsRes, blogsRes, invoicesRes, accessRes]) => {
          const emailsEnabled = (emailRes as { enabled?: boolean })?.enabled ?? false
          const whatsappEnabled = (waRes as { enabled?: boolean })?.enabled ?? false
          const analyticsEnabled = (analyticsRes as { enabled?: boolean })?.enabled ?? false
          const blogsEnabled = (blogsRes as { enabled?: boolean })?.enabled ?? false
          const invoicesEnabled = (invoicesRes as { enabled?: boolean })?.enabled ?? false
          const access = accessRes as {
            success?: boolean
            permissions?: string[]
            organizationRole?: OrganizationRoleDisplay | null
            organizationRoleId?: string | null
            memberRoleString?: string
          } | null
          setState((prev) => {
            if (!prev.organization || prev.organization.id !== orgId) return prev
            const next: LayoutState = {
              ...prev,
              organization: {
                ...prev.organization,
                emails_enabled: emailsEnabled,
                whatsapp_enabled: whatsappEnabled,
                analytics_enabled: analyticsEnabled,
                blogs_enabled: blogsEnabled,
                invoices_enabled: invoicesEnabled,
              },
              sidebarData: prev.sidebarData
                ? {
                    ...prev.sidebarData,
                    emailsEnabled,
                    whatsappEnabled,
                    analyticsEnabled,
                    blogsEnabled,
                    invoicesEnabled,
                  }
                : null,
            }
            if (access?.success && Array.isArray(access.permissions)) {
              next.permissionSet = new Set(access.permissions)
              next.organizationRole = access.organizationRole ?? null
              next.organizationRoleId = access.organizationRoleId ?? null
              next.permissionsReady = true
              if (access.memberRoleString) {
                next.userRole = access.memberRoleString
                next.organization = { ...next.organization!, role: access.memberRoleString }
              }
            }
            return next
          })
        }).catch(() => {})
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
            permissionSet: new Set(),
            permissionsReady: false,
            organizationRole: null,
            organizationRoleId: null,
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
              permissionSet: new Set(),
              permissionsReady: false,
              organizationRole: null,
              organizationRoleId: null,
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
            permissionSet: new Set(),
            permissionsReady: false,
            organizationRole: null,
            organizationRoleId: null,
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

      // Fetch feature flags from API
      let emailsEnabled = false
      let whatsappEnabled = false
      let analyticsEnabled = false
      let blogsEnabled = false
      let invoicesEnabled = false
      try {
        const [emailRes, waRes, analyticsRes, blogsRes, invoicesRes] = await Promise.all([
          api.organizationSettings.getEmailsEnabled(organization.id),
          api.whatsapp.checkEnabled(organization.id).catch(() => ({ enabled: false })),
          api.organizationSettings.getAnalyticsEnabled(organization.id).catch(() => ({ enabled: false })),
          api.organizationSettings.getBlogsEnabled(organization.id).catch(() => ({ enabled: false })),
          api.organizationSettings.getInvoicesEnabled(organization.id).catch(() => ({ enabled: false })),
        ])
        emailsEnabled = emailRes?.enabled ?? false
        whatsappEnabled = (waRes as any)?.enabled ?? false
        analyticsEnabled = (analyticsRes as any)?.enabled ?? false
        blogsEnabled = (blogsRes as any)?.enabled ?? false
        invoicesEnabled = (invoicesRes as any)?.enabled ?? false
      } catch (error) {
        console.error("Failed to fetch feature flags:", error)
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
            permissionSet: new Set(),
            permissionsReady: false,
            organizationRole: null,
            organizationRoleId: null,
            sidebarData: null,
          })
          return
        }
      }

      const isAdmin = (session?.user as { role?: string })?.role === "admin" || (session?.user as { role?: string })?.role?.includes?.("admin")
      const resolvedRole = userMembership?.role || (isAdmin ? "admin" : undefined)
      
      const [unseenFormsResult, unreadEmailsResult, unreadWhatsappResult] = await Promise.all([
        api.forms.getUnseenCount(organization.id),
        emailsEnabled ? api.emails.getUnreadCount(organization.id) : Promise.resolve({ success: true, count: 0 }),
        whatsappEnabled ? api.whatsapp.getUnreadCount(organization.id).catch(() => ({ success: true, count: 0 })) : Promise.resolve({ success: true, count: 0 }),
      ])

      let permissionSet = getAllGrantablePermissionsSet()
      let organizationRole: OrganizationRoleDisplay | null = null
      let organizationRoleId: string | null = null
      let accessMemberRole = resolvedRole || null
      try {
        const access = (await api.members.getAccess(organization.id)) as {
          success?: boolean
          permissions?: string[]
          organizationRole?: OrganizationRoleDisplay | null
          organizationRoleId?: string | null
          memberRoleString?: string
        }
        if (access.success && Array.isArray(access.permissions)) {
          permissionSet = new Set(access.permissions)
          organizationRole = access.organizationRole ?? null
          organizationRoleId = access.organizationRoleId ?? null
          if (access.memberRoleString) accessMemberRole = access.memberRoleString
        }
      } catch (e) {
        console.warn("Failed to load org member permissions:", e)
        permissionSet = getAllGrantablePermissionsSet()
      }

      setState({
        organization: {
          ...organization,
          createdAt:
            typeof organization.createdAt === "string" ? organization.createdAt : organization.createdAt.toISOString(),
          members,
          role: accessMemberRole ?? resolvedRole,
          emails_enabled: emailsEnabled,
          whatsapp_enabled: whatsappEnabled,
          analytics_enabled: analyticsEnabled,
          blogs_enabled: blogsEnabled,
          invoices_enabled: invoicesEnabled,
        },
        loading: false,
        error: null,
        userRole: accessMemberRole ?? resolvedRole ?? null,
        permissionSet,
        permissionsReady: true,
        organizationRole,
        organizationRoleId,
        sidebarData: {
          unseenFormsCount: unseenFormsResult.success ? unseenFormsResult.count : 0,
          unreadEmailsCount: unreadEmailsResult.success ? unreadEmailsResult.count : 0,
          unreadWhatsappCount: (unreadWhatsappResult as any).success ? (unreadWhatsappResult as any).count : 0,
          emailsEnabled,
          whatsappEnabled,
          analyticsEnabled,
          blogsEnabled,
          invoicesEnabled,
        },
      })
    } catch (error: any) {
      console.error("Error validating organization access:", error)
      setState({
        organization: null,
        loading: false,
        error: error.message || "Failed to validate organization access",
        userRole: null,
        permissionSet: new Set(),
        permissionsReady: false,
        organizationRole: null,
        organizationRoleId: null,
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
        return "bg-primary/12 text-primary"
      case "admin":
        return "bg-chart-2/12 text-chart-2"
      case "member":
        return "bg-chart-5/12 text-chart-5"
      default:
        return "bg-muted/80 text-muted-foreground"
    }
  }

  // Mobile Menu Component (tablet / desktop header hamburger)
  const MobileMenu = () => {
    const org = state.organization
    if (!org) return null
    const sheetPrimary = mobilePrimaryNavItems(slug, flatRoutes, {
      analytics_enabled: org.analytics_enabled,
      blogs_enabled: org.blogs_enabled,
      emails_enabled: org.emails_enabled,
      whatsapp_enabled: org.whatsapp_enabled,
      invoices_enabled: org.invoices_enabled,
    }, state.permissionSet)
    const sheetManagement = mobileManagementNavItems(slug, flatRoutes, state.permissionSet)
    return (
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
          <div className="bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-xl shadow-none ring-0">
                <AvatarImage
                  src={orgLogoOrBrandProxy(state.organization?.logo, state.organization?.name || "Organization")}
                />
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
          <div className="scrollbar-app flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Navigation
                </h4>
                <div className="space-y-1">
                  {sheetPrimary.map((item) => (
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
                  {sheetManagement.map((item) => (
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
  }

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
  if (isReady && preferAppShell) {
    return (
      <CustomDomainCtx.Provider value={customDomainCtx}>
      <OrganizationProvider
        organization={state.organization}
        userRole={state.userRole}
        loading={state.loading}
        error={state.error}
        onRefresh={validateOrganizationAccess}
        permissionSet={state.permissionSet}
        permissionsReady={state.permissionsReady}
        organizationRole={state.organizationRole}
        organizationRoleId={state.organizationRoleId}
      >
        <UserNotificationProvider>
          <EmailsProvider>
            <AppShellLayout
              slug={slug}
              flatRoutes={flatRoutes}
              organizationName={state.organization.name}
              organizationLogo={
                state.organization.logo?.trim() ||
                orgLogoOrBrandProxy(state.organization.logo, state.organization.name)
              }
              emailsEnabled={state.organization.emails_enabled ?? false}
              analyticsEnabled={state.organization.analytics_enabled ?? false}
              blogsEnabled={state.organization.blogs_enabled ?? false}
              whatsappEnabled={state.organization.whatsapp_enabled ?? false}
              invoicesEnabled={state.organization.invoices_enabled ?? false}
              userRole={state.userRole ?? "member"}
              permissionSet={state.permissionSet}
              sessionUser={{
                name: session?.user?.name,
                image: session?.user?.image,
                email: session?.user?.email,
              }}
              onSignOut={handleSignOut}
            >
              <OrgRouteGuard slug={slug} flatRoutes={flatRoutes}>
                {children}
              </OrgRouteGuard>
            </AppShellLayout>
          </EmailsProvider>
        </UserNotificationProvider>
      </OrganizationProvider>
      </CustomDomainCtx.Provider>
    )
  }

  return (
    <CustomDomainCtx.Provider value={customDomainCtx}>
    <OrganizationProvider
      organization={state.organization}
      userRole={state.userRole}
      loading={state.loading}
      error={state.error}
      onRefresh={validateOrganizationAccess}
      permissionSet={state.permissionSet}
      permissionsReady={state.permissionsReady}
      organizationRole={state.organizationRole}
      organizationRoleId={state.organizationRoleId}
    >
      <UserNotificationProvider>
        <EmailsProvider>
        <SidebarProvider>
        {/* No backdrop-blur here: it creates a containing block for position:fixed, so the
            shadcn Sidebar (fixed) would scroll with this ancestor. Blur stays on header/inset only. */}
        <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-gradient-to-br from-background via-background/92 to-muted/25">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <OrganizationSidebarWrapper
              workspaceSlug={slug}
              flatRoutes={flatRoutes}
              organization={{
                id: state.organization.id,
                name: state.organization.name,
                logo: state.organization.logo || null,
                emails_enabled: state.organization.emails_enabled ?? false,
                whatsapp_enabled: state.organization.whatsapp_enabled ?? false,
                analytics_enabled: state.organization.analytics_enabled ?? false,
                blogs_enabled: state.organization.blogs_enabled ?? false,
                invoices_enabled: state.organization.invoices_enabled ?? false,
              }}
              sessionUser={{ name: session?.user?.name, image: session?.user?.image }}
              onSignOut={handleSignOut}
              initialUnseenFormsCount={state.sidebarData?.unseenFormsCount ?? 0}
              initialUnreadEmailsCount={state.sidebarData?.unreadEmailsCount ?? 0}
              initialUnreadWhatsappCount={state.sidebarData?.unreadWhatsappCount ?? 0}
              initialEmailsEnabled={state.sidebarData?.emailsEnabled ?? false}
              initialWhatsappEnabled={state.sidebarData?.whatsappEnabled ?? false}
              initialAnalyticsEnabled={state.sidebarData?.analyticsEnabled ?? false}
              initialBlogsEnabled={state.sidebarData?.blogsEnabled ?? false}
              initialInvoicesEnabled={state.sidebarData?.invoicesEnabled ?? false}
              permissionSet={state.permissionSet}
            />
          </div>

          <SidebarInset className="min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
            {/* Enhanced Responsive Header */}
            <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background px-3 md:gap-4 md:px-6 lg:px-8">
              {/* Desktop Sidebar Trigger */}
              <SidebarTrigger className="text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground hidden rounded-xl p-2 md:flex" />

              {/* Mobile Menu Trigger */}
              <MobileMenu />

              <div className="min-w-0 flex-1" aria-hidden />

              {/* Right Section */}
              <div className="ml-auto flex items-center gap-2 md:gap-4">
                <div className="hidden sm:block">
                  <div className="rounded-lg p-1">
                    <ThemeToggle />
                  </div>
                </div>

                <div className="relative">
                  <div className="rounded-lg p-1">
                    <NotificationBell />
                  </div>
                </div>

                <Badge
                  className={`${getRoleColor(state.userRole || "member")} hidden border-0 shadow-none md:inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize`}
                  variant="secondary"
                >
                  {(state.userRole || "member").replace(/^./, (c) => c.toUpperCase())}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-foreground/[0.06] flex h-10 items-center gap-2 rounded-xl px-3 md:h-11 md:gap-3 md:px-4"
                    >
                      <Avatar className="h-7 w-7 shadow-none ring-0 md:h-8 md:w-8">
                        <AvatarImage src={session?.user?.image || ""} />
                        <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
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
                          <AvatarImage
                            src={orgLogoOrBrandProxy(state.organization?.logo, state.organization?.name || "Organization")}
                          />
                          <AvatarFallback className="text-xs">
                            {state.organization?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{state.organization?.name}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="justify-center">
                        <Badge className={getRoleColor(state.userRole || "member")} variant="secondary">
                          {state.organizationRole?.name || state.userRole || "member"}
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
                      onClick={() => router.push(orgNavPath(slug, flatRoutes, "settings"))}
                      className="flex items-center gap-2"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                    {!isCustomDomain && (
                      <DropdownMenuItem onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Switch Organization</span>
                      </DropdownMenuItem>
                    )}
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

            <main className={cn(
              "flex-1 min-h-0 flex flex-col bg-transparent",
              isWhatsappRoute || isMailRoute ? "overflow-hidden p-0" : "scrollbar-app overflow-auto px-3 py-3 sm:px-4 md:px-6 md:py-5 lg:px-8",
            )}>
              <OrgRouteGuard slug={slug} flatRoutes={flatRoutes}>
                {isWhatsappRoute || isMailRoute ? (
                  children
                ) : (
                  <MainContentMotion routeKey={pathname ?? ""}>{children}</MainContentMotion>
                )}
              </OrgRouteGuard>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
        </EmailsProvider>
      </UserNotificationProvider>
    </OrganizationProvider>
    </CustomDomainCtx.Provider>
  )
}
