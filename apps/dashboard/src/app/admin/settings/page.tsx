"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Settings,
  Shield,
  Mail,
  Globe,
  RefreshCw,
  AlertTriangle,
  Building2,
  Users,
  Terminal,
  Info,
  SlidersHorizontal,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { authClient } from "@/lib/auth/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminOrganizationSettingsPanel } from "@/components/admin/admin-organization-settings-panel"

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemInfo, setSystemInfo] = useState({
    totalOrganizations: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    environment: process.env.NODE_ENV || "development",
  })

  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null)

  const fetchSystemInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = (await api.admin.getOrganizations()) as {
        success?: boolean
        organizations?: any[]
        error?: string
      }
      const orgs = result?.organizations
      if (result?.success && orgs) {
        const allUsers = new Set<string>()
        let activeSubscriptions = 0
        orgs.forEach((org: any) => {
          org.members?.forEach((member: any) => {
            if (member.user?.id) allUsers.add(member.user.id)
          })
          org.subscriptions_subscriptions_organization_idToorganization?.forEach((sub: any) => {
            if (sub.status === "active") activeSubscriptions++
          })
        })
        setSystemInfo({
          totalOrganizations: orgs.length,
          totalUsers: allUsers.size,
          activeSubscriptions,
          environment: process.env.NODE_ENV || "development",
        })
      } else {
        setError(result?.error || "Failed to fetch system information")
      }
    } catch {
      setError("Failed to fetch system information")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSystemInfo()
  }, [fetchSystemInfo])

  useEffect(() => {
    authClient.organization
      .list()
      .then((result) => {
        const data = (result as { data?: Array<{ slug?: string }> })?.data
        if (data?.length && data[0]?.slug) setWorkspaceSlug(data[0].slug)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              Platform settings
            </h1>
            <p className="text-muted-foreground mt-1.5 max-w-3xl">
              Environment overview and shortcuts. To edit <strong>any</strong> organization (name, logo, team, slug)
              as platform admin, open{" "}
              <Link href="/admin/settings/organization" className="underline font-medium text-foreground">
                Organization settings
              </Link>
              . Tenant-facing UI lives under{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">/{'{slug}'}/settings</code>.
            </p>
          </div>
        </motion.div>

        <Alert className="border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Admin console</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <Button variant="secondary" size="sm" className="mr-2 mb-2 sm:mb-0" asChild>
              <Link href="/admin/settings/organization" className="gap-2 inline-flex items-center">
                <SlidersHorizontal className="h-4 w-4" />
                Organization settings
              </Link>
            </Button>
            <span className="block sm:inline sm:ml-1">
              Manage any org without being a member. The <strong>Your workspace</strong> tab below is a shortcut if you
              belong to an organization.
            </span>{" "}
            <Link href="/admin/users" className="underline font-medium text-foreground">
              Users
            </Link>{" "}
            ·{" "}
            <Link href="/admin/organizations" className="underline font-medium text-foreground">
              Organizations
            </Link>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="platform" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="workspace" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Your workspace
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" />
              Users &amp; orgs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button onClick={fetchSystemInfo} disabled={loading} variant="outline" size="sm" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh stats
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/environment" className="gap-2 inline-flex items-center">
                  <Terminal className="h-4 w-4" />
                  Environment
                </Link>
              </Button>
            </div>

            {error && (
              <Card className="border-destructive/50">
                <CardContent className="pt-6 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <h3 className="font-semibold text-destructive">Error loading data</h3>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Platform overview
                </CardTitle>
                <CardDescription>High-level counts across all tenants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Environment</p>
                    {loading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <Badge className="mt-1" variant={systemInfo.environment === "production" ? "default" : "secondary"}>
                        {systemInfo.environment}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organizations</p>
                    {loading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold mt-1">{systemInfo.totalOrganizations}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Distinct users</p>
                    {loading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold mt-1">{systemInfo.totalUsers}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active subscriptions</p>
                    {loading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold mt-1">{systemInfo.activeSubscriptions}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication &amp; email
                </CardTitle>
                <CardDescription>Better Auth and transactional email run on the API; secrets are in server environment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Invitations, password reset, and org inbox features depend on email being enabled in production.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/environment">View environment (masked)</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Database &amp; storage
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>PostgreSQL and object storage are configured for the deployment. Backups follow your host (e.g. Supabase).</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workspace" className="space-y-6">
            {!workspaceSlug ? (
              <Card>
                <CardContent className="py-10 text-center space-y-4 text-muted-foreground">
                  <p>You are not a member of an organization on this account.</p>
                  <p className="text-sm">
                    As platform admin you can still manage every organization from{" "}
                    <Link href="/admin/settings/organization" className="underline font-medium text-foreground">
                      Organization settings
                    </Link>
                    .
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/admin/settings/organization">Open organization settings</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Shortcut to the first organization on your account. For the full org picker (all tenants), use{" "}
                  <Link href="/admin/settings/organization" className="underline font-medium text-foreground">
                    Organization settings
                  </Link>
                  .
                </p>
                <AdminOrganizationSettingsPanel
                  activeSlug={workspaceSlug}
                  onActiveSlugChange={setWorkspaceSlug}
                  showOrganizationPicker={false}
                  idPrefix="plat-ws"
                  onOrganizationDeleted={async () => {
                    await fetchSystemInfo()
                    try {
                      const result = await authClient.organization.list()
                      const data = (result as { data?: Array<{ slug?: string }> })?.data
                      if (data?.length && data[0]?.slug) setWorkspaceSlug(data[0].slug)
                      else setWorkspaceSlug(null)
                    } catch {
                      setWorkspaceSlug(null)
                    }
                  }}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All users
                  </CardTitle>
                  <CardDescription>Search, roles, bans, and activity across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href="/admin/users">Open user admin</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    All organizations
                  </CardTitle>
                  <CardDescription>Create orgs, subscriptions, and feature flags</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary">
                    <Link href="/admin/organizations">Open organizations</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/admin/settings/organization">Org settings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Your account
                </CardTitle>
                <CardDescription>Personal profile, password, and sessions — not platform-wide</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/account/settings">Profile &amp; password</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
