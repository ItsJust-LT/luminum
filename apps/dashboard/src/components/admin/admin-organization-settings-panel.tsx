"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { api } from "@/lib/api"
import {
  Building2,
  UserPlus,
  ImageIcon,
  ExternalLink,
  ChevronsUpDown,
  Trash2,
  Check,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TransferOwnershipDialog } from "@/components/dashboard/transfer-ownership-dialog"
import { AdminOrganizationEmailDomainSection } from "@/components/admin/admin-organization-email-domain-section"
import { AdminOrganizationResendSection } from "@/components/admin/admin-organization-resend-section"
import { AdminOrganizationPlatformFeatures } from "@/components/admin/admin-organization-platform-features"

export type AdminOrgListItem = { id: string; name: string; slug: string }

type OrgMember = {
  id: string
  role: string
  user?: { id: string; name?: string | null; email?: string | null; image?: string | null }
}

type InvitationRow = {
  id: string
  email: string
  role?: string | null
  ownership_transfer?: boolean
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
  analytics_enabled?: boolean
  emails_enabled?: boolean
  whatsapp_enabled?: boolean
  blogs_enabled?: boolean
  invoices_enabled?: boolean
  branded_dashboard_enabled?: boolean
  custom_domain?: string | null
  custom_domain_prefix?: string | null
  custom_domain_verified?: boolean
  email_dns_verified_at?: string | Date | null
  email_domain_id?: string | null
  email_from_address?: string | null
  websites?: { id: string; domain: string; name?: string | null }[]
}

export type AdminOrganizationSettingsPanelProps = {
  /** Current organization slug to load (controlled). */
  activeSlug: string | null
  onActiveSlugChange?: (slug: string) => void
  /** Show dropdown to pick any organization (platform admin). */
  showOrganizationPicker: boolean
  /** Back link + org title row for `/admin/settings/organization/[slug]`. */
  showSlugPageChrome?: boolean
  /** e.g. redirect to organizations list when slug is unknown. */
  onOrganizationNotFound?: () => void
  organizations?: AdminOrgListItem[]
  /** Prefix for form element ids when multiple panels could exist (a11y). */
  idPrefix?: string
  /** After a successful org delete, refresh parent lists or session (e.g. refetch org picker). */
  onOrganizationDeleted?: () => void | Promise<void>
}

export function AdminOrganizationSettingsPanel({
  activeSlug,
  onActiveSlugChange,
  showOrganizationPicker,
  showSlugPageChrome = false,
  onOrganizationNotFound,
  organizations = [],
  idPrefix = "",
  onOrganizationDeleted,
}: AdminOrganizationSettingsPanelProps) {
  const pid = idPrefix ? `${idPrefix}-` : ""
  const [loading, setLoading] = useState(false)
  const [org, setOrg] = useState<WorkspaceOrg | null>(null)
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
  const [addRole, setAddRole] = useState("member")
  const [addingMember, setAddingMember] = useState(false)
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userSearchHits, setUserSearchHits] = useState<
    { id: string; name: string | null; email: string; image: string | null }[]
  >([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [selectedAddUser, setSelectedAddUser] = useState<{
    id: string
    name: string | null
    email: string
  } | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null)
  const [removingMember, setRemovingMember] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteSlugInput, setDeleteSlugInput] = useState("")
  const [deletingOrg, setDeletingOrg] = useState(false)

  const loadOrg = useCallback(async (slug: string) => {
    setLoading(true)
    setOrg((prev) => (prev?.slug === slug ? prev : null))
    try {
      const res = (await api.admin.getOrganizationBySlug(slug)) as {
        success?: boolean
        organization?: WorkspaceOrg
        error?: string
      }
      if (!res.success || !res.organization) {
        toast.error(res.error || "Could not load organization")
        setOrg(null)
        onOrganizationNotFound?.()
        return
      }
      const o = res.organization
      setOrg(o)
      setOrgForm({
        name: o.name || "",
        slug: o.slug || "",
        country: o.country || "South Africa",
        currency: o.currency || "ZAR",
        billing_email: o.billing_email || "",
        tax_id: o.tax_id || "",
      })
    } catch (e: any) {
      toast.error(e?.message || "Could not load organization")
      setOrg(null)
    } finally {
      setLoading(false)
    }
  }, [onOrganizationNotFound])

  useEffect(() => {
    if (activeSlug) loadOrg(activeSlug)
    else {
      setOrg(null)
      setLoading(false)
    }
  }, [activeSlug, loadOrg])

  useEffect(() => {
    const q = userSearchQuery.trim()
    if (q.length < 2) {
      setUserSearchHits([])
      setUserSearchLoading(false)
      return
    }
    setUserSearchLoading(true)
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = (await api.admin.searchUsers(q)) as {
            success?: boolean
            users?: { id: string; name: string | null; email: string; image: string | null }[]
          }
          setUserSearchHits(res.users ?? [])
        } catch {
          setUserSearchHits([])
        } finally {
          setUserSearchLoading(false)
        }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [userSearchQuery])

  const refresh = () => {
    if (activeSlug) loadOrg(activeSlug)
  }

  const handleSaveOrg = async () => {
    if (!org?.id) return
    setSavingOrg(true)
    try {
      const res = (await api.admin.patchOrganization(org.id, {
        name: orgForm.name.trim(),
        slug: orgForm.slug.trim().toLowerCase(),
        country: orgForm.country.trim(),
        currency: orgForm.currency.trim().toUpperCase(),
        billing_email: orgForm.billing_email.trim() || null,
        tax_id: orgForm.tax_id.trim() || null,
      })) as { success?: boolean; organization?: WorkspaceOrg; error?: string }
      if (res.success && res.organization) {
        setOrg(res.organization)
        const newSlug = res.organization.slug
        if (newSlug !== activeSlug && onActiveSlugChange) {
          onActiveSlugChange(newSlug)
          toast.success("Slug updated — URL refreshed.")
        } else {
          toast.success("Organization updated")
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
    if (!file || !org?.id) return
    setUploadingLogo(true)
    try {
      const bytes = await file.arrayBuffer()
      const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
      const result = (await api.organizationSettings.uploadLogo(org.id, {
        logoBase64,
        fileName: file.name,
        contentType: file.type,
      })) as { success?: boolean; data?: { logoUrl?: string }; error?: string }
      if (result.success && result.data?.logoUrl) {
        setOrg((prev) => (prev ? { ...prev, logo: result.data!.logoUrl } : prev))
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
    if (!org?.id) return
    try {
      const result = (await api.organizationSettings.deleteLogo(org.id)) as {
        success?: boolean
        error?: string
      }
      if (result.success) {
        setOrg((prev) => (prev ? { ...prev, logo: null } : prev))
        toast.success("Logo removed")
      } else {
        toast.error(result.error || "Failed to remove logo")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove logo")
    }
  }

  const handleInvite = async () => {
    if (!org?.id || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await api.admin.inviteOrganizationMember(org.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      toast.success("Invitation sent")
      setInviteEmail("")
      refresh()
    } catch (e: any) {
      toast.error(e?.message || "Invite failed")
    } finally {
      setInviting(false)
    }
  }

  const handleAddMember = async () => {
    if (!org?.id || !selectedAddUser) return
    setAddingMember(true)
    try {
      await api.admin.addOrganizationMember(org.id, {
        userId: selectedAddUser.id,
        role: addRole,
      })
      toast.success("Member added")
      setSelectedAddUser(null)
      setUserSearchQuery("")
      setUserPickerOpen(false)
      refresh()
    } catch (e: any) {
      toast.error(e?.message || "Could not add member")
    } finally {
      setAddingMember(false)
    }
  }

  const confirmRemoveMember = async () => {
    if (!org?.id || !memberToRemove) return
    setRemovingMember(true)
    try {
      await api.admin.removeOrganizationMember(org.id, memberToRemove.id)
      toast.success("Member removed")
      setMemberToRemove(null)
      refresh()
    } catch (e: any) {
      toast.error(e?.message || "Could not remove member")
    } finally {
      setRemovingMember(false)
    }
  }

  const confirmDeleteOrganization = async () => {
    if (!org?.id || !org.slug || deleteSlugInput.trim() !== org.slug) return
    setDeletingOrg(true)
    try {
      await api.admin.deleteOrganization(org.id, org.slug)
      toast.success("Organization deleted")
      setDeleteDialogOpen(false)
      setDeleteSlugInput("")
      setOrg(null)
      await onOrganizationDeleted?.()
    } catch (e: any) {
      toast.error(e?.message || "Could not delete organization")
    } finally {
      setDeletingOrg(false)
    }
  }

  const members = org?.members ?? []
  const invitations = org?.invitations ?? []

  const pickerCard =
    showOrganizationPicker && organizations.length > 0 ? (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </CardTitle>
          <CardDescription>Choose which tenant to manage as platform admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor={`${pid}org-picker`} className="sr-only">
            Organization
          </Label>
          <Select
            value={activeSlug || undefined}
            onValueChange={(v) => onActiveSlugChange?.(v)}
          >
            <SelectTrigger id={`${pid}org-picker`} className="max-w-md w-full">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {organizations.map((o) => (
                <SelectItem key={o.id} value={o.slug}>
                  {o.name}{" "}
                  <span className="text-muted-foreground font-mono text-xs">/{o.slug}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    ) : null

  if (!activeSlug) {
    return (
      <div className="space-y-6">
        {pickerCard}
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {showOrganizationPicker ? (
              <p>Select an organization to edit branding, billing, and team access.</p>
            ) : (
              <p>No workspace linked to this account.</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pickerCard}

      {showSlugPageChrome && activeSlug ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Button variant="outline" size="sm" asChild className="w-fit shrink-0">
              <Link href="/admin/organizations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to organizations
              </Link>
            </Button>
            {loading && !org ? (
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-8 max-w-sm" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ) : org ? (
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Avatar className="h-14 w-14 shrink-0 rounded-xl border-2 border-border">
                  <AvatarImage src={org.logo || ""} className="object-cover" />
                  <AvatarFallback className="rounded-xl text-lg">
                    {org.name?.slice(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold tracking-tight">{org.name}</h1>
                  <p className="font-mono text-sm text-muted-foreground">/{org.slug}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This organization could not be loaded.</p>
            )}
          </div>
        </div>
      ) : null}

      {loading && !org ? (
        <div className="space-y-4">
          {!showSlugPageChrome ? <Skeleton className="h-40 w-full" /> : null}
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !org ? (
        <p className="text-muted-foreground text-sm">Could not load this organization.</p>
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${org.slug}/settings`} className="gap-2 inline-flex items-center">
            <ExternalLink className="h-4 w-4" />
            Client workspace settings
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${org.slug}/dashboard`} className="gap-2 inline-flex items-center">
            Open workspace dashboard
          </Link>
        </Button>
      </div>

      <AdminOrganizationPlatformFeatures
        org={{
          id: org.id,
          slug: org.slug,
          name: org.name,
          analytics_enabled: org.analytics_enabled ?? false,
          emails_enabled: org.emails_enabled ?? false,
          whatsapp_enabled: org.whatsapp_enabled ?? false,
          blogs_enabled: org.blogs_enabled ?? false,
          invoices_enabled: org.invoices_enabled ?? false,
          branded_dashboard_enabled: org.branded_dashboard_enabled ?? false,
          custom_domain: org.custom_domain ?? null,
          custom_domain_prefix: org.custom_domain_prefix ?? null,
          custom_domain_verified: org.custom_domain_verified ?? false,
          email_dns_verified_at: org.email_dns_verified_at ?? null,
        }}
        onUpdated={refresh}
      />

      {org.id && org.slug ? (
        <AdminOrganizationEmailDomainSection
          organizationId={org.id}
          organizationSlug={org.slug}
          websites={(org.websites ?? []).map((w) => ({
            id: w.id,
            domain: w.domain,
            name: w.name ?? null,
          }))}
          linkedWebsiteId={org.email_domain_id ?? null}
          onUpdated={refresh}
        />
      ) : null}

      {org.id && org.slug ? (
        <AdminOrganizationResendSection
          organizationId={org.id}
          organizationSlug={org.slug}
          onUpdated={refresh}
        />
      ) : null}

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
            <AvatarImage src={org.logo || ""} className="object-cover" />
            <AvatarFallback className="rounded-xl text-lg">
              {org.name?.slice(0, 2).toUpperCase() || "?"}
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
              {org.logo && (
                <Button type="button" variant="ghost" size="sm" onClick={handleLogoRemove}>
                  Remove logo
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG or JPG, max 5 MB.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>Name, URL slug, and billing fields (platform admin)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor={`${pid}org-name`}>Name</Label>
            <Input
              id={`${pid}org-name`}
              value={orgForm.name}
              onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${pid}org-slug`}>Slug (URL)</Label>
            <Input
              id={`${pid}org-slug`}
              value={orgForm.slug}
              onChange={(e) => setOrgForm((f) => ({ ...f, slug: e.target.value }))}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, hyphens. Changing this updates workspace URLs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${pid}org-country`}>Country</Label>
              <Input
                id={`${pid}org-country`}
                value={orgForm.country}
                onChange={(e) => setOrgForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${pid}org-currency`}>Currency</Label>
              <Input
                id={`${pid}org-currency`}
                value={orgForm.currency}
                onChange={(e) => setOrgForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${pid}org-billing`}>Billing email</Label>
            <Input
              id={`${pid}org-billing`}
              type="email"
              value={orgForm.billing_email}
              onChange={(e) => setOrgForm((f) => ({ ...f, billing_email: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${pid}org-tax`}>Tax ID</Label>
            <Input
              id={`${pid}org-tax`}
              value={orgForm.tax_id}
              onChange={(e) => setOrgForm((f) => ({ ...f, tax_id: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <Button onClick={handleSaveOrg} disabled={savingOrg}>
            {savingOrg ? "Saving…" : "Save organization"}
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
            Invites send email. Add member attaches an existing user immediately.
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
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Sending…" : "Send invitation"}
            </Button>
          </div>

          {org?.id ? (
            <div className="space-y-2 max-w-md pt-4 border-t">
              <p className="text-sm font-medium">Transfer ownership</p>
              <p className="text-xs text-muted-foreground">
                Send a link to the next owner by email (registered or not). When they accept, they become owner and current owners become admins.
              </p>
              <TransferOwnershipDialog organizationId={org.id} organizationName={org.name || org.slug} onSent={refresh} />
            </div>
          ) : null}

          <div className="space-y-3 max-w-md">
            <p className="text-sm font-medium">Add existing user</p>
            <p className="text-xs text-muted-foreground">
              Search by name or email, then pick the account to attach immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Popover
                open={userPickerOpen}
                onOpenChange={(o) => {
                  setUserPickerOpen(o)
                  if (!o) setUserSearchQuery("")
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={userPickerOpen}
                    className="w-full justify-between font-normal sm:min-w-[240px]"
                  >
                    {selectedAddUser ? (
                      <span className="truncate text-left">
                        {selectedAddUser.name || selectedAddUser.email}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({selectedAddUser.email})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Search users…</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 sm:w-[400px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type name or email…"
                      value={userSearchQuery}
                      onValueChange={setUserSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty className="py-3 text-xs text-muted-foreground px-2">
                        {userSearchQuery.trim().length < 2
                          ? "Enter at least 2 characters."
                          : userSearchLoading
                            ? "Searching…"
                            : "No users found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {userSearchHits.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={u.id}
                            onSelect={() => {
                              setSelectedAddUser({
                                id: u.id,
                                name: u.name,
                                email: u.email,
                              })
                              setUserPickerOpen(false)
                              setUserSearchQuery("")
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedAddUser?.id === u.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{u.name || u.email}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              onClick={handleAddMember}
              disabled={addingMember || !selectedAddUser}
            >
              {addingMember ? "Adding…" : "Add to organization"}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${m.user?.name || m.user?.email || "member"}`}
                    onClick={() => setMemberToRemove(m)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                  <Badge variant="secondary">
                    {inv.ownership_transfer ? "Ownership transfer" : inv.role || "member"}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete this organization, all of its data, and object storage for this tenant. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-w-md">
          <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            Delete organization…
          </Button>
        </CardContent>
      </Card>
        </>
      )}

      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `${memberToRemove.user?.name || memberToRemove.user?.email || "This user"} will lose access to ${org?.name || "this organization"}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removingMember}
              onClick={(e) => {
                e.preventDefault()
                void confirmRemoveMember()
              }}
            >
              {removingMember ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (deletingOrg && !open) return
          setDeleteDialogOpen(open)
          if (!open) setDeleteSlugInput("")
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  All members, websites, email, billing links, files in storage, and database records for{" "}
                  <strong className="text-foreground">{org?.name}</strong> will be removed.
                </p>
                <p>
                  Type the organization slug <span className="font-mono text-foreground">{org?.slug}</span> to confirm.
                </p>
                <Input
                  value={deleteSlugInput}
                  onChange={(e) => setDeleteSlugInput(e.target.value)}
                  placeholder="slug"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOrg}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingOrg || deleteSlugInput.trim() !== (org?.slug ?? "")}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteOrganization()
              }}
            >
              {deletingOrg ? "Deleting…" : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
