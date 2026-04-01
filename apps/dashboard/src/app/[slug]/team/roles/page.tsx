"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Shield, Sparkles, Users, Pencil } from "lucide-react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useTeamHref } from "@/lib/team/use-team-href"
import { ORG_ROLE_KIND } from "@luminum/org-permissions"
import { TeamSkeleton } from "@/components/ui/team-skeleton"

type OrgRoleRow = {
  id: string
  name: string
  kind: string
  permissionCount?: number
  color?: string
}

export default function TeamRolesPage() {
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canManage = hasAllPermissions(["team:roles:manage"])
  const [roles, setRoles] = useState<OrgRoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!organization?.id) return
    let cancelled = false
    setLoading(true)
    api.organizationRoles
      .list(organization.id)
      .then((res) => {
        const r = res as { success?: boolean; roles?: OrgRoleRow[]; error?: string }
        if (cancelled) return
        if (!r.success) {
          setErr(r.error || "Could not load roles")
          setRoles([])
          return
        }
        setRoles(r.roles || [])
        setErr(null)
      })
      .catch(() => {
        if (!cancelled) setErr("Could not load roles")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organization?.id])

  if (orgLoading || loading) {
    return (
      <AppPageContainer>
        <TeamSkeleton />
      </AppPageContainer>
    )
  }

  if (orgError || !organization) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>{orgError || "Organization not found"}</CardDescription>
          </CardHeader>
        </Card>
      </AppPageContainer>
    )
  }

  const builtin = roles.filter((r) => r.kind !== ORG_ROLE_KIND.custom)
  const custom = roles.filter((r) => r.kind === ORG_ROLE_KIND.custom)

  return (
    <AppPageContainer>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-0">
        <div>
          <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground" asChild>
            <Link href={href("")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to team
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Roles & permissions</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-2xl">
            Control what people can do in <span className="font-medium text-foreground">{organization.name}</span>.
            Owners and admins always have full access. Everyone else gets access from the{" "}
            <strong className="text-foreground">Member</strong> default, a <strong className="text-foreground">saved role</strong>, or{" "}
            <strong className="text-foreground">individual permissions</strong> set on their profile (no separate role name needed).
          </p>
        </div>

        {err && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{err}</CardContent>
          </Card>
        )}

        <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.06] to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Assign access to someone
            </CardTitle>
            <CardDescription>
              Open the team list and choose <strong>Manage access</strong> next to a member. There you can pick a saved role or toggle
              permissions directly—we save that as private access without asking you to create a role first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default" size="sm">
              <Link href={href("")}>Go to team members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Built-in roles
            </CardTitle>
            <CardDescription>These ship with every workspace. You can adjust the default member permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {builtin.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/60 p-3 sm:p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {r.kind.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.kind === ORG_ROLE_KIND.owner || r.kind === ORG_ROLE_KIND.admin
                      ? "Full workspace access."
                      : `Default permissions for people invited as “member”. ${typeof r.permissionCount === "number" ? `${r.permissionCount} permissions.` : ""}`}
                  </p>
                </div>
                {canManage && r.kind === ORG_ROLE_KIND.member_template && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={href(`roles/${r.id}`)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit default member permissions
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Saved custom roles
              </CardTitle>
              <CardDescription>
                Reusable permission sets you can assign when inviting someone or from a member’s access page.
              </CardDescription>
            </div>
            {canManage && (
              <Button asChild size="sm" className="shrink-0">
                <Link href={href("roles/new")}>New saved role</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {custom.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center sm:text-left">
                No saved custom roles yet.
                {canManage ? (
                  <>
                    {" "}
                    Create one to reuse the same permissions for several people, or skip this and use individual permissions per member.
                  </>
                ) : null}
              </p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
                {custom.map((r) => (
                  <li key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-card/30">
                    <div>
                      <span className="font-medium">{r.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeof r.permissionCount === "number" ? `${r.permissionCount} permissions` : "Custom"}
                      </p>
                    </div>
                    {canManage && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={href(`roles/${r.id}`)}>Edit</Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {!canManage && (
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            You can view this page with team access. Only people with <strong>Manage custom roles</strong> can create or edit saved roles
            and the default member template.
          </p>
        )}
      </div>
    </AppPageContainer>
  )
}
