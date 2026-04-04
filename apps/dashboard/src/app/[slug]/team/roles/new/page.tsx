"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState, useMemo } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useTeamHref } from "@/lib/team/use-team-href"
import type { PermissionDefinition } from "@luminum/org-permissions"
import {
  filterPermissionDefinitionsForOrgFeatures,
  filterRoleTemplatesForOrgFeatures,
} from "@luminum/org-permissions"
import { orgFeatureFlagsFromOrganization } from "@/lib/org-feature-flags"
import { PermissionMatrix } from "@/components/team/permission-matrix"
import { TeamSkeleton } from "@/components/ui/team-skeleton"
import { toast } from "sonner"

function NewTeamRolePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canManage = hasAllPermissions(["team:roles:manage"])

  const [perms, setPerms] = useState<readonly PermissionDefinition[]>([])
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string; permissionIds: readonly string[] }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [catalogLoaded, setCatalogLoaded] = useState(false)

  useEffect(() => {
    api.organizationRoles
      .catalog()
      .then((res) => {
        const r = res as {
          success?: boolean
          permissions?: PermissionDefinition[]
          roleTemplates?: { id: string; name: string; description: string; permissionIds: readonly string[] }[]
        }
        if (r.permissions) setPerms(r.permissions)
        if (r.roleTemplates) setTemplates(r.roleTemplates)
      })
      .finally(() => setCatalogLoaded(true))
  }, [])

  const orgFlags = useMemo(() => orgFeatureFlagsFromOrganization(organization), [organization])
  const visiblePerms = useMemo(
    () => filterPermissionDefinitionsForOrgFeatures(perms, orgFlags),
    [perms, orgFlags]
  )
  const visibleTemplates = useMemo(
    () => filterRoleTemplatesForOrgFeatures(templates, orgFlags),
    [templates, orgFlags]
  )

  useEffect(() => {
    if (!templateId || !visibleTemplates.length) return
    const t = visibleTemplates.find((x) => x.id === templateId)
    if (t) {
      setSelected(new Set(t.permissionIds))
      setName((prev) => prev || `${t.name} (copy)`)
    }
  }, [templateId, visibleTemplates])

  const templateCards = useMemo(() => visibleTemplates, [visibleTemplates])

  const onPickTemplate = (id: string) => {
    const t = visibleTemplates.find((x) => x.id === id)
    if (!t) return
    setSelected(new Set(t.permissionIds))
    setName(`${t.name}`)
    router.replace(href("roles/new"))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id || !canManage) return
    const n = name.trim() || "Custom role"
    if (selected.size === 0) {
      toast.error("Choose at least one permission")
      return
    }
    setSaving(true)
    try {
      const res = (await api.organizationRoles.create(organization.id, {
        name: n,
        permissionIds: [...selected],
      })) as { success?: boolean; error?: string; role?: { id: string } }
      if (!res.success) throw new Error(res.error || "Failed")
      toast.success("Saved role")
      router.push(href(`roles/${res.role?.id}`))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (orgLoading || !catalogLoaded) {
    return (
      <AppPageContainer>
        <TeamSkeleton />
      </AppPageContainer>
    )
  }

  if (orgError || !organization || !canManage) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>New role</CardTitle>
            <CardDescription>
              {!canManage ? "You need permission to manage custom roles." : orgError || "Not found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={href("roles")}>Back</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer>
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href={href("roles")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Roles & permissions
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">New saved role</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
            Name this once, then assign it to people from the team page. You can also skip saved roles and set permissions per person
            under <strong>Manage access</strong>.
          </p>
        </div>

        {templateCards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Start from a template</CardTitle>
              <CardDescription>Prefills permissions—you can still change everything before saving.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {templateCards.map((t) => (
                <Button key={t.id} type="button" variant="secondary" size="sm" onClick={() => onPickTemplate(t.id)}>
                  {t.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role name</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="role-name">Display name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marketing editor"
                className="mt-2 max-w-md"
                maxLength={120}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permissions</CardTitle>
              <CardDescription>Turning on advanced actions automatically includes what they depend on.</CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionMatrix definitions={visiblePerms} selected={selected} onChange={setSelected} />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href={href("roles")}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Create role"
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppPageContainer>
  )
}

export default function NewTeamRolePage() {
  return (
    <Suspense
      fallback={
        <AppPageContainer>
          <TeamSkeleton />
        </AppPageContainer>
      }
    >
      <NewTeamRolePageInner />
    </Suspense>
  )
}
