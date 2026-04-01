"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, UserMinus } from "lucide-react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useTeamHref } from "@/lib/team/use-team-href"
import { TeamSkeleton } from "@/components/ui/team-skeleton"
import { toast } from "sonner"

type Row = { id: string; userId: string; role: string; user?: { name?: string | null; email?: string | null } }

export default function RemoveMemberPage() {
  const params = useParams()
  const membershipId = params.memberId as string
  const router = useRouter()
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canRemove = hasAllPermissions(["team:remove"])

  const [member, setMember] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (!organization?.id) return
    let cancelled = false
    setLoading(true)
    api.members
      .list(organization.id)
      .then((res) => {
        const r = res as { data?: Row[] }
        const rows = r.data || []
        const found = rows.find((x) => x.id === membershipId) || null
        if (!cancelled) setMember(found)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organization?.id, membershipId])

  const onRemove = async () => {
    if (!organization || !member?.userId) return
    const name = member.user?.name || member.user?.email || "Member"
    const email = member.user?.email || ""
    setRemoving(true)
    try {
      const result = (await api.organizationActions.removeMember({
        memberId: member.userId,
        memberEmail: email,
        memberName: name,
        organizationName: organization.name,
        organizationId: organization.id,
      })) as { success?: boolean; error?: string }
      if (!result.success) throw new Error(result.error || "Failed")
      toast.success(`${name} removed from ${organization.name}`)
      router.push(href(""))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setRemoving(false)
    }
  }

  if (orgLoading || loading) {
    return (
      <AppPageContainer>
        <TeamSkeleton />
      </AppPageContainer>
    )
  }

  if (orgError || !organization || !canRemove) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Remove member</CardTitle>
            <CardDescription>{!canRemove ? "You cannot remove members." : orgError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={href("")}>Back</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  if (!member) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Member not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={href("")}>Back</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  if (member.role === "owner") {
    return (
      <AppPageContainer>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link href={href("")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Team
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Cannot remove owner</CardTitle>
            <CardDescription>Transfer ownership first, then the previous owner can be removed.</CardDescription>
          </CardHeader>
        </Card>
      </AppPageContainer>
    )
  }

  const display = member.user?.name || member.user?.email || "This member"

  return (
    <AppPageContainer>
      <div className="max-w-lg mx-auto space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href={href("")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Team
          </Link>
        </Button>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <UserMinus className="h-5 w-5" />
              Remove member
            </CardTitle>
            <CardDescription>
              Remove <strong className="text-foreground">{display}</strong> from <strong className="text-foreground">{organization.name}</strong>
              ? They will lose access immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" asChild>
              <Link href={href("")}>Cancel</Link>
            </Button>
            <Button variant="destructive" disabled={removing} onClick={() => void onRemove()}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove from organization"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppPageContainer>
  )
}
