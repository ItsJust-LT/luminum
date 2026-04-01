"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useTeamHref } from "@/lib/team/use-team-href"
import type { PermissionDefinition } from "@luminum/org-permissions"
import { ORG_ROLE_KIND } from "@luminum/org-permissions"
import { PermissionMatrix } from "@/components/team/permission-matrix"
import { TeamSkeleton } from "@/components/ui/team-skeleton"
import { toast } from "sonner"

type RoleRow = {
  id: string
  name: string
  kind: string
  permissions?: string[]
}

export default function EditTeamRolePage() {
  const params = useParams()
  const roleId = params.roleId as string
  const router = useRouter()
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canManage = hasAllPermissions(["team:roles:manage"])

  const [perms, setPerms] = useState<readonly PermissionDefinition[]>([])
  const [role, setRole] = useState<RoleRow | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.organizationRoles.catalog().then((res) => {
      const r = res as { permissions?: PermissionDefinition[] }
      if (r.permissions) setPerms(r.permissions)
    })
  }, [])

  useEffect(() => {
    if (!organization?.id || !roleId) return
    let cancelled = false
    setLoading(true)
    api.organizationRoles
      .list(organization.id)
      .then((res) => {
        const r = res as { success?: boolean; roles?: RoleRow[] }
        if (cancelled || !r.success || !r.roles) return
        const found = r.roles.find((x) => x.id === roleId) || null
        setRole(found)
        if (found?.permissions) setSelected(new Set(found.permissions))
        setName(found?.name || "")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organization?.id, roleId])

  const editable =
    role &&
    (role.kind === ORG_ROLE_KIND.custom || role.kind === ORG_ROLE_KIND.member_template) &&
    canManage

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id || !role || !editable) return
    if (selected.size === 0) {
      toast.error("Choose at least one permission")
      return
    }
    setSaving(true)
    try {
      const res = (await api.organizationRoles.update(organization.id, role.id, {
        name: name.trim() || role.name,
        permissionIds: [...selected],
      })) as { success?: boolean; error?: string }
      if (!res.success) throw new Error(res.error || "Failed")
      toast.success("Role updated")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!organization?.id || !role || role.kind !== ORG_ROLE_KIND.custom) return
    if (!confirm(`Delete role “${role.name}”? Members must be reassigned first.`)) return
    setDeleting(true)
    try {
      const res = (await api.organizationRoles.delete(organization.id, role.id)) as { success?: boolean; error?: string }
      if (!res.success) throw new Error(res.error || "Failed")
      toast.success("Role deleted")
      router.push(href("roles"))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setDeleting(false)
    }
  }

  if (orgLoading || loading) {
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
            <CardTitle>Edit role</CardTitle>
            <CardDescription>{!canManage ? "You need permission to manage roles." : orgError}</CardDescription>
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

  if (!role) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Role not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={href("roles")}>Back to roles</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  if (role.kind === ORG_ROLE_KIND.owner || role.kind === ORG_ROLE_KIND.admin) {
    return (
      <AppPageContainer>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link href={href("roles")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{role.name}</CardTitle>
            <CardDescription>Built-in full-access roles cannot be edited here.</CardDescription>
          </CardHeader>
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
          <h1 className="text-2xl sm:text-3xl font-bold">{role.name}</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {role.kind === ORG_ROLE_KIND.member_template
              ? "This is the default for people invited as “member”. Changes apply to everyone still on this default."
              : "Saved role — assign from a member’s access page or when inviting."}
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          {editable && role.kind === ORG_ROLE_KIND.custom && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Name</CardTitle>
              </CardHeader>
              <CardContent>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="max-w-md" />
              </CardContent>
            </Card>
          )}

          {editable && role.kind === ORG_ROLE_KIND.member_template && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Name</CardTitle>
                <CardDescription>The “Member” label is fixed for clarity; only permissions change.</CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permissions</CardTitle>
              <CardDescription>Dependent permissions are added or removed automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionMatrix
                definitions={perms}
                selected={selected}
                onChange={setSelected}
                disabled={!editable}
              />
            </CardContent>
          </Card>

          {editable && (
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center">
              {role.kind === ORG_ROLE_KIND.custom ? (
                <Button type="button" variant="destructive" size="sm" disabled={deleting} onClick={() => void onDelete()}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete role
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <Button type="button" variant="outline" asChild>
                  <Link href={href("roles")}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </AppPageContainer>
  )
}
