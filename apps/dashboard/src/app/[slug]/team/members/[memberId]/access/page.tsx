"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useSession } from "@/lib/auth/client"
import { useOrganization } from "@/lib/contexts/organization-context"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { useTeamHref } from "@/lib/team/use-team-href"
import type { PermissionDefinition } from "@luminum/org-permissions"
import { ORG_ROLE_KIND, filterPermissionDefinitionsForOrgFeatures } from "@luminum/org-permissions"
import { orgFeatureFlagsFromOrganization } from "@/lib/org-feature-flags"
import { PermissionMatrix } from "@/components/team/permission-matrix"
import { TeamSkeleton } from "@/components/ui/team-skeleton"
import { toast } from "sonner"

type MemberAccessPayload = {
  success?: boolean
  fullAccess?: boolean
  member?: { id: string; userId?: string; name: string; email: string; role: string }
  permissionIds?: string[]
}

type RoleOpt = { id: string; name: string; kind: string }

export default function MemberAccessPage() {
  const params = useParams()
  const memberRowId = params.memberId as string
  const router = useRouter()
  const { data: session } = useSession()
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canAssign = hasAllPermissions(["team:roles:assign"])

  const [catalog, setCatalog] = useState<readonly PermissionDefinition[]>([])
  const [access, setAccess] = useState<MemberAccessPayload | null>(null)
  const [roles, setRoles] = useState<RoleOpt[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [pickRoleId, setPickRoleId] = useState("")

  useEffect(() => {
    api.organizationRoles.catalog().then((res) => {
      const r = res as { permissions?: PermissionDefinition[] }
      if (r.permissions) setCatalog(r.permissions)
    })
  }, [])

  const load = () => {
    if (!organization?.id || !memberRowId) return
    setLoading(true)
    Promise.all([
      api.organizationRoles.getMemberAccess(organization.id, memberRowId) as Promise<MemberAccessPayload>,
      api.organizationRoles.list(organization.id) as Promise<{ success?: boolean; roles?: RoleOpt[] }>,
    ])
      .then(([a, list]) => {
        setAccess(a.success ? a : null)
        if (a.permissionIds) setSelected(new Set(a.permissionIds))
        if (list.success && list.roles) {
          const invitable = list.roles.filter((x) => x.kind !== ORG_ROLE_KIND.owner)
          setRoles(invitable)
        }
      })
      .catch(() => setAccess(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when org + member id stable
  }, [organization?.id, memberRowId])

  const orgFlags = useMemo(() => orgFeatureFlagsFromOrganization(organization), [organization])
  const visibleCatalog = useMemo(
    () => filterPermissionDefinitionsForOrgFeatures(catalog, orgFlags),
    [catalog, orgFlags]
  )

  const onApplyRole = async () => {
    if (!organization?.id || !pickRoleId || !memberRowId) return
    setAssigning(true)
    try {
      const res = (await api.organizationRoles.assignMember(organization.id, {
        memberRowId,
        organizationRoleId: pickRoleId,
      })) as { success?: boolean; error?: string }
      if (!res.success) throw new Error(res.error || "Failed")
      toast.success("Role applied")
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setAssigning(false)
    }
  }

  const onSaveDirect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id || !memberRowId || access?.fullAccess) return
    if (selected.size === 0) {
      toast.error("Choose at least one permission")
      return
    }
    setSaving(true)
    try {
      const res = (await api.organizationRoles.setMemberPermissions(organization.id, {
        memberRowId,
        permissionIds: [...selected],
      })) as { success?: boolean; error?: string }
      if (!res.success) throw new Error(res.error || "Failed")
      toast.success("Access updated")
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  if (orgLoading || loading) {
    return (
      <AppPageContainer>
        <TeamSkeleton />
      </AppPageContainer>
    )
  }

  if (orgError || !organization || !canAssign) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Manage access</CardTitle>
            <CardDescription>
              {!canAssign ? "You need permission to assign roles." : orgError}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={href("")}>Back to team</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  if (!access?.member) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Member not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={href("")}>Back to team</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  const m = access.member
  const full = access.fullAccess === true
  const viewingSelf = Boolean(session?.user?.id && m.userId && session.user.id === m.userId)

  return (
    <AppPageContainer>
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href={href("")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Team
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Manage access</h1>
          <p className="text-muted-foreground mt-2">
            <span className="font-medium text-foreground">{m.name}</span>
            {m.email ? <span className="block sm:inline sm:before:content-['·'] sm:before:mx-2">{m.email}</span> : null}
          </p>
        </div>

        {full && (
          <Card className="border-violet-500/30 bg-violet-500/[0.06]">
            <CardHeader>
              <CardTitle className="text-base">Workspace owner</CardTitle>
              <CardDescription>
                {viewingSelf ? (
                  <>
                    You have full access to this workspace. Permissions cannot be reduced while you are the owner. Use{" "}
                    <strong>Transfer ownership</strong> on the team page if you want someone else to become owner.
                  </>
                ) : (
                  <>
                    The workspace owner always has full access. To change who owns this organization, use{" "}
                    <strong>Transfer ownership</strong> on the team page.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href={href("")}>Back to team</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!full && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick assign a saved role</CardTitle>
                <CardDescription>
                  Applies an existing role in one step. You can still fine-tune with individual permissions below afterward.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 space-y-2 w-full">
                  <Label>Role</Label>
                  <Select value={pickRoleId} onValueChange={setPickRoleId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                          <span className="text-muted-foreground text-xs ml-2 capitalize">({r.kind.replace(/_/g, " ")})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" disabled={!pickRoleId || assigning} onClick={() => void onApplyRole()}>
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply role"}
                </Button>
              </CardContent>
            </Card>

            <form onSubmit={onSaveDirect}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Individual permissions</CardTitle>
                  <CardDescription>
                    No need to create a named role—save directly. We store this as private access for this person. Required companion
                    permissions are handled for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PermissionMatrix definitions={visibleCatalog} selected={selected} onChange={setSelected} />
                  <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <Button type="button" variant="outline" asChild>
                      <Link href={href("")}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save individual permissions"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </>
        )}
      </div>
    </AppPageContainer>
  )
}
