"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  UserPlus,
  ImageIcon,
  ExternalLink,
  Terminal,
  Info,
} from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { authClient } from "@/lib/auth/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type OrgMember = {
  id: string
  role: string
  user?: { id: string; name?: string | null; email?: string | null; image?: string | null }
}

type InvitationRow = {
  id: string
  email: string
  role?: string | null
  expiresAt?: string
}

type WorkspaceOrg = {
  id: string
  name: string
  slug: string
  logo?: string | null
  country?: string | null
  currency?: string | null
  billing_email?: string | null
  tax_id?: string | null
  members?: OrgMember[]
  invitations?: InvitationRow[]
}

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
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceOrg, setWorkspaceOrg] = useState<WorkspaceOrg | null>(null)
  const [orgForm, setOrgForm] = useState({
    name: "",
    slug: "",
    country: "",
    currency: "",
    billing_email: "",
    tax_id: "",
  })
  const [savingOrg, setSavingOrg] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addRole, setAddRole] = useState("member")
  const [addingMember, setAddingMember] = useState(false)

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

  const loadWorkspaceOrg = useCallback(async (slug: string) => {
    setWorkspaceLoading(true)
    try {
      const res = (await api.admin.getOrganizationBySlug(slug)) as {
        success?: boolean
        organization?: WorkspaceOrg
        error?: string
      }
      if (!res.success || !res.organization) {
        toast.error(res.error || "Could not load workspace")
        setWorkspaceOrg(null)
        return
      }
      const o = res.organization
      setWorkspaceOrg(o)
      setOrgForm({
        name: o.name || "",
        slug: o.slug || "",
        country: o.country || "South Africa",
        currency: o.currency || "ZAR",
        billing_email: o.billing_email || "",
        tax_id: o.tax_id || "",
      })
    } catch (e: any) {
      toast.error(e?.message || "Could not load workspace")
      setWorkspaceOrg(null)
    } finally {
      setWorkspaceLoading(false)
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

  useEffect(() => {
    if (workspaceSlug) loadWorkspaceOrg(workspaceSlug)
  }, [workspaceSlug, loadWorkspaceOrg])

  const handleSaveOrg = async () => {
    if (!workspaceOrg?.id) return
    setSavingOrg(true)
    try {
      const res = (await api.admin.patchOrganization(workspaceOrg.id, {
        name: orgForm.name.trim(),
        slug: orgForm.slug.trim().toLowerCase(),
        country: orgForm.country.trim(),
        currency: orgForm.currency.trim().toUpperCase(),
        billing_email: orgForm.billing_email.trim() || null,
        tax_id: orgForm.tax_id.trim() || null,
      })) as { success?: boolean; organization?: WorkspaceOrg; error?: string }
      if (res.success && res.organization) {
        setWorkspaceOrg(res.organization)
        if (res.organization.slug !== workspaceSlug) {
          setWorkspaceSlug(res.organization.slug)
          toast.success("Workspace URL slug changed — links updated on next load.")
        } else {
          toast.success("Workspace updated")
        }
      } else {
        toast.error(res.error || "Failed to save")
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSavingOrg(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspaceOrg?.id) return
    setUploadingLogo(true)
    try {
      const bytes = await file.arrayBuffer()
      const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
      const result = (await api.organizationSettings.uploadLogo(workspaceOrg.id, {
        logoBase64,
        fileName: file.name,
        contentType: file.type,
      })) as { success?: boolean; data?: { logoUrl?: string }; error?: string }
      if (result.success && result.data?.logoUrl) {
        setWorkspaceOrg((prev) => (prev ? { ...prev, logo: result.data!.logoUrl } : prev))
        toast.success("Logo updated")
      } else {
        toast.error(result.error || "Upload failed")
      }
    } catch (err: any) {
      toast.error(err?.message || "Upload failed")
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

  const handleLogoRemove = async () => {
    if (!workspaceOrg?.id) return
    try {
      const result = (await api.organizationSettings.deleteLogo(workspaceOrg.id)) as {
        success?: boolean
        error?: string
      }
      if (result.success) {
        setWorkspaceOrg((prev) => (prev ? { ...prev, logo: null } : prev))
        toast.success("Logo removed")
      } else {
        toast.error(result.error || "Failed to remove logo")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove logo")
    }
  }

  const handleInvite = async () => {
    if (!workspaceOrg?.id || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await api.admin.inviteOrganizationMember(workspaceOrg.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      toast.success("Invitation sent")
      setInviteEmail("")
      if (workspaceSlug) await loadWorkspaceOrg(workspaceSlug)
    } catch (e: any) {
      toast.error(e?.message || "Invite failed")
    } finally {
      setInviting(false)
    }
  }

  const handleAddMember = async () => {
    if (!workspaceOrg?.id || !addEmail.trim()) return
    setAddingMember(true)
    try {
      await api.admin.addOrganizationMember(workspaceOrg.id, {
        email: addEmail.trim(),
        role: addRole,
      })
      toast.success("Member added")
      setAddEmail("")
      if (workspaceSlug) await loadWorkspaceOrg(workspaceSlug)
    } catch (e: any) {
      toast.error(e?.message || "Could not add member")
    } finally {
      setAddingMember(false)
    }
  }

  const members = workspaceOrg?.members ?? []
  const invitations = workspaceOrg?.invitations ?? []

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
              Configure the Luminum admin console and your own workspace. This is not the same as a client
              organization&apos;s workspace settings (those live under{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">/{'{slug}'}/settings</code>
              ).
            </p>
          </div>
        </motion.div>

        <Alert className="border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Admin console</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            You are signed in as a platform administrator. Use{" "}
            <span className="font-medium text-foreground">Your workspace</span> below to manage the organization you
            belong to (name, logo, team). Use{" "}
            <Link href="/admin/users" className="underline font-medium text-foreground">
              Users
            </Link>{" "}
            and{" "}
            <Link href="/admin/organizations" className="underline font-medium text-foreground">
              Organizations
            </Link>{" "}
            for everyone on the platform.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="platform" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="workspace" className="gap-1.5" disabled={!workspaceSlug}>
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
                <CardContent className="py-10 text-center text-muted-foreground">
                  <p>You are not a member of any organization yet. Create one from the dashboard or ask an admin to invite you.</p>
                  <Button className="mt-4" asChild variant="outline">
                    <Link href="/dashboard">Open dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : workspaceLoading && !workspaceOrg ? (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : workspaceOrg ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${workspaceOrg.slug}/settings`} className="gap-2 inline-flex items-center">
                      <ExternalLink className="h-4 w-4" />
                      Full workspace settings (client UI)
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${workspaceOrg.slug}/dashboard`} className="gap-2 inline-flex items-center">
                      Open workspace
                    </Link>
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Branding
                    </CardTitle>
                    <CardDescription>Logo and name shown across the workspace</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-6 items-start">
                    <Avatar className="h-24 w-24 rounded-xl border-2 border-border">
                      <AvatarImage src={workspaceOrg.logo || ""} className="object-cover" />
                      <AvatarFallback className="rounded-xl text-lg">
                        {workspaceOrg.name?.slice(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={uploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {uploadingLogo ? "Uploading…" : "Upload logo"}
                        </Button>
                        {workspaceOrg.logo && (
                          <Button type="button" variant="ghost" size="sm" onClick={handleLogoRemove}>
                            Remove logo
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">PNG or JPG, max 5 MB. Stored in your org storage.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workspace details</CardTitle>
                    <CardDescription>Name, URL slug, and billing fields (platform admin)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Name</Label>
                      <Input
                        id="org-name"
                        value={orgForm.name}
                        onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-slug">Slug (URL)</Label>
                      <Input
                        id="org-slug"
                        value={orgForm.slug}
                        onChange={(e) => setOrgForm((f) => ({ ...f, slug: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens. Changing this updates workspace URLs.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-country">Country</Label>
                        <Input
                          id="org-country"
                          value={orgForm.country}
                          onChange={(e) => setOrgForm((f) => ({ ...f, country: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-currency">Currency</Label>
                        <Input
                          id="org-currency"
                          value={orgForm.currency}
                          onChange={(e) => setOrgForm((f) => ({ ...f, currency: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-billing">Billing email</Label>
                      <Input
                        id="org-billing"
                        type="email"
                        value={orgForm.billing_email}
                        onChange={(e) => setOrgForm((f) => ({ ...f, billing_email: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-tax">Tax ID</Label>
                      <Input
                        id="org-tax"
                        value={orgForm.tax_id}
                        onChange={(e) => setOrgForm((f) => ({ ...f, tax_id: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <Button onClick={handleSaveOrg} disabled={savingOrg}>
                      {savingOrg ? "Saving…" : "Save workspace"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Invite &amp; add people
                    </CardTitle>
                    <CardDescription>
                      Invites send email (new or existing accounts). Add member attaches an existing dashboard user immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-3 max-w-md">
                      <p className="text-sm font-medium">Invite by email</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="colleague@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          type="email"
                        />
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                        {inviting ? "Sending…" : "Send invitation"}
                      </Button>
                    </div>

                    <div className="space-y-3 max-w-md">
                      <p className="text-sm font-medium">Add existing user</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Registered email"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          type="email"
                        />
                        <Select value={addRole} onValueChange={setAddRole}>
                          <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="secondary" onClick={handleAddMember} disabled={addingMember || !addEmail.trim()}>
                        {addingMember ? "Adding…" : "Add to workspace"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Members ({members.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y rounded-lg border">
                      {members.length === 0 ? (
                        <li className="p-4 text-sm text-muted-foreground">No members</li>
                      ) : (
                        members.map((m) => (
                          <li key={m.id} className="flex items-center gap-3 p-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={m.user?.image || ""} />
                              <AvatarFallback>{m.user?.name?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{m.user?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                            </div>
                            <Badge variant="outline">{m.role}</Badge>
                          </li>
                        ))
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pending invitations ({invitations.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y rounded-lg border">
                      {invitations.length === 0 ? (
                        <li className="p-4 text-sm text-muted-foreground">None</li>
                      ) : (
                        invitations.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                            <span className="truncate">{inv.email}</span>
                            <Badge variant="secondary">{inv.role || "member"}</Badge>
                          </li>
                        ))
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Could not load workspace.</p>
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
                <CardContent>
                  <Button asChild variant="secondary">
                    <Link href="/admin/organizations">Open organizations</Link>
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
