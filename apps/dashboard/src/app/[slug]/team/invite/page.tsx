"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { ArrowLeft, Loader2, Mail, Shield, UserPlus, Users } from "lucide-react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"
import { useTeamHref } from "@/lib/team/use-team-href"
import { TeamSkeleton } from "@/components/ui/team-skeleton"
import { toast } from "sonner"
import { ORG_ROLE_KIND } from "@luminum/org-permissions"

type OrgRoleRow = { id: string; name: string; kind: string }

function InviteTeamMemberForm() {
  const router = useRouter()
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canInvite = hasAllPermissions(["team:invite"])

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [orgRoles, setOrgRoles] = useState<OrgRoleRow[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!organization?.id || !canInvite) {
      setLoading(false)
      return
    }
    api.organizationRoles
      .list(organization.id)
      .then((res) => {
        const r = res as { success?: boolean; roles?: OrgRoleRow[] }
        if (!r.success || !r.roles) return
        const invitable = r.roles.filter((x) => x.kind !== ORG_ROLE_KIND.owner)
        setOrgRoles(invitable)
        const memberTemplate = invitable.find((x) => x.kind === "member_template")
        const fallback =
          memberTemplate?.id ?? invitable.find((x) => x.kind === "admin")?.id ?? invitable[0]?.id ?? ""
        setSelectedRoleId(fallback)
      })
      .finally(() => setLoading(false))
  }, [organization?.id, canInvite])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    setSubmitting(true)
    setError("")
    try {
      const { data: session } = await authClient.getSession()
      if (!session?.user) throw new Error("You must be logged in")

      let resolvedRole: "admin" | "member" = role
      let organizationRoleId: string | undefined
      if (orgRoles.length > 0 && selectedRoleId) {
        const picked = orgRoles.find((x) => x.id === selectedRoleId)
        organizationRoleId = selectedRoleId
        resolvedRole = picked?.kind === "admin" ? "admin" : "member"
      }

      const result = await api.organizationActions.sendInvitation({
        email,
        role: resolvedRole,
        organizationId: organization.id,
        organizationName: organization.name,
        ...(organizationRoleId ? { organizationRoleId } : {}),
      })

      if (!result.success) throw new Error(result.error || "Failed")
      toast.success(`Invitation sent to ${email}`)
      router.push(href(""))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed"
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (orgLoading || loading) {
    return (
      <AppPageContainer>
        <TeamSkeleton />
      </AppPageContainer>
    )
  }

  if (orgError || !organization || !canInvite) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Invite member</CardTitle>
            <CardDescription>{!canInvite ? "You cannot send invitations." : orgError}</CardDescription>
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

  return (
    <AppPageContainer>
      <div className="max-w-lg mx-auto space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href={href("")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Team
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            Invite team member
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Add someone to {organization.name}.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitation</CardTitle>
            <CardDescription>We&apos;ll email them a link to join.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="inv-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="inv-email"
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Role
                </Label>
                {orgRoles.length > 0 ? (
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={role} onValueChange={(v: "admin" | "member") => setRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Member
                        </span>
                      </SelectItem>
                      <SelectItem value="admin">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href={href("")}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={submitting || !email.trim()}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppPageContainer>
  )
}

export default function InviteTeamMemberPage() {
  return (
    <Suspense
      fallback={
        <AppPageContainer>
          <TeamSkeleton />
        </AppPageContainer>
      }
    >
      <InviteTeamMemberForm />
    </Suspense>
  )
}
