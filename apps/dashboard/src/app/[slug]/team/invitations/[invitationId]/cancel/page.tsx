"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useTeamHref } from "@/lib/team/use-team-href"
import { TeamSkeleton } from "@/components/ui/team-skeleton"
import { toast } from "sonner"

type Inv = { id: string; email: string; role: string }

export default function CancelInvitationPage() {
  const params = useParams()
  const invitationId = params.invitationId as string
  const router = useRouter()
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canInvite = hasAllPermissions(["team:invite"])

  const [inv, setInv] = useState<Inv | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!organization?.id) return
    let cancelled = false
    setLoading(true)
    api.organizationActions
      .getInvitations(organization.id)
      .then((res) => {
        const r = res as { success?: boolean; invitations?: Inv[] }
        const list = r.invitations || []
        const found = list.find((x) => x.id === invitationId) || null
        if (!cancelled) setInv(found)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organization?.id, invitationId])

  const onCancel = async () => {
    if (!inv) return
    setCancelling(true)
    try {
      const result = (await api.organizationActions.cancelInvitation(inv.id)) as { success?: boolean; error?: string }
      if (!result.success) throw new Error(result.error || "Failed")
      toast.success(`Invitation to ${inv.email} cancelled`)
      router.push(href(""))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setCancelling(false)
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
            <CardTitle>Cancel invitation</CardTitle>
            <CardDescription>{!canInvite ? "You cannot manage invitations." : orgError}</CardDescription>
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

  if (!inv) {
    return (
      <AppPageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
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

  return (
    <AppPageContainer>
      <div className="max-w-lg mx-auto space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href={href("")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Team
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Cancel invitation</CardTitle>
            <CardDescription>
              Stop <strong className="text-foreground">{inv.email}</strong> from using this invite. You can send a new one later from the
              team page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" asChild>
              <Link href={href("")}>Keep invitation</Link>
            </Button>
            <Button variant="destructive" disabled={cancelling} onClick={() => void onCancel()}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel invitation"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppPageContainer>
  )
}
