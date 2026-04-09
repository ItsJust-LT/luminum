"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Shield,
  User2,
  UserMinus,
  Mail,
  KeyRound,
  UserPlus,
  Crown,
} from "lucide-react"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { TransferOwnershipDialog } from "@/components/dashboard/transfer-ownership-dialog"
import { useSession } from "@/lib/auth/client"
import { api } from "@/lib/api"
import { TeamSkeleton } from "@/components/ui/team-skeleton"
import { useTeamHref } from "@/lib/team/use-team-href"
import { cn } from "@/lib/utils"

interface MemberUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface OrganizationMember {
  id: string
  role: "owner" | "admin" | "member" | string
  userId: string
  user?: MemberUser
  organization_role?: { id: string; name: string; color: string; iconKey: string; kind: string } | null
}

interface OrganizationInvitation {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt: string
  inviterId?: string | null
  ownershipTransfer?: boolean
}

function roleBadgeClasses(role: string) {
  switch (role) {
    case "owner":
      return "border-chart-1/40 bg-chart-1/12 text-chart-1"
    case "admin":
      return "border-border bg-muted/60 text-muted-foreground"
    default:
      return "border-chart-2/40 bg-chart-2/12 text-chart-2"
  }
}

function RoleBadge({ role, label }: { role: string; label: string }) {
  const text = label.toLowerCase()
  return (
    <Badge variant="outline" className={cn("shrink-0 text-[10px] font-medium sm:text-xs", roleBadgeClasses(role))}>
      {text}
    </Badge>
  )
}

function memberDisplayName(m: OrganizationMember) {
  return m.user?.name || m.user?.email || "User"
}

export default function TeamPage() {
  const params = useParams()
  const slug = params.slug as string
  const { data: session } = useSession()
  const { organization, userRole, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const { href } = useTeamHref()
  const canInvite = hasAllPermissions(["team:invite"])
  const canRemove = hasAllPermissions(["team:remove"])
  const canAssignRoles = hasAllPermissions(["team:roles:assign"])
  const isPlatformAdmin = (session?.user as { role?: string } | undefined)?.role === "admin"
  const canTransferOwnership = userRole === "owner" || isPlatformAdmin
  const { onlineUsers } = useRealtime()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    if (!organization) return
    try {
      setLoading(true)
      const listRes = (await api.members.list(organization.id)) as { data?: OrganizationMember[]; error?: string | null }
      if (listRes.error) throw new Error(String(listRes.error))
      setMembers(listRes.data || [])
    } catch (error) {
      console.error("Failed to load members:", error)
    } finally {
      setLoading(false)
    }
  }, [organization])

  const fetchInvitations = useCallback(async () => {
    if (!organization) return
    try {
      const result = (await api.organizationActions.getInvitations(organization.id)) as {
        success?: boolean
        invitations?: OrganizationInvitation[]
        error?: string
      }
      if (result.success) {
        setInvitations(result.invitations || [])
      } else {
        console.error("Failed to load invitations:", result.error)
      }
    } catch (error) {
      console.error("Failed to load invitations:", error)
    }
  }, [organization])

  useEffect(() => {
    if (!orgLoading && organization) {
      void fetchMembers()
      void fetchInvitations()
    }
  }, [orgLoading, organization?.id, fetchMembers, fetchInvitations])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }

  const isInvitationExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const refreshAll = () => {
    void fetchMembers()
    void fetchInvitations()
  }

  if (orgLoading || loading) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <TeamSkeleton />
      </AppPageContainer>
    )
  }

  if (orgError || !organization) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <div className="flex min-h-[50vh] flex-1 items-center justify-center p-4">
          <Card className="app-card w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Team</CardTitle>
              <CardDescription>{orgError || "This organization could not be loaded."}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href={slug ? `/${slug}/dashboard` : "/"}>Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppPageContainer>
    )
  }

  const pendingInviteCount = invitations.filter((i) => !isInvitationExpired(i.expiresAt)).length

  return (
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Team</h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
                People with access to <span className="text-foreground font-medium">{organization.name}</span>. Invite
                collaborators, adjust roles, and review pending invitations.
              </p>
              <p className="text-muted-foreground text-xs">
                {members.length} member{members.length === 1 ? "" : "s"}
                {canInvite && invitations.length > 0
                  ? ` · ${pendingInviteCount} pending invitation${pendingInviteCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto" asChild>
              <Link href={href("roles")}>
                <KeyRound className="h-4 w-4" />
                Roles & permissions
              </Link>
            </Button>
            {canTransferOwnership && (
              <TransferOwnershipDialog
                organizationId={organization.id}
                organizationName={organization.name}
                onSent={refreshAll}
              />
            )}
            {canInvite && (
              <Button size="sm" className="w-full gap-2 sm:w-auto" asChild>
                <Link href={href("invite")}>
                  <UserPlus className="h-4 w-4" />
                  Invite member
                </Link>
              </Button>
            )}
          </div>
        </div>
        <Separator />
      </header>

      <Card className="app-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Members</CardTitle>
          <CardDescription>Everyone who can sign in to this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0 sm:px-6">
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center sm:px-6">
              <Users className="text-muted-foreground h-10 w-10" />
              <p className="text-muted-foreground max-w-sm text-sm">No members loaded.</p>
              {canInvite && (
                <Button size="sm" className="gap-2" asChild>
                  <Link href={href("invite")}>
                    <UserPlus className="h-4 w-4" />
                    Invite someone
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Member</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden sm:table-cell">Presence</TableHead>
                      <TableHead className="text-right">{canAssignRoles || canRemove ? "Actions" : ""}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const isOnline = m.userId ? onlineUsers.has(m.userId) : false
                      const name = memberDisplayName(m)
                      const roleLabel = m.organization_role?.name || m.role
                      return (
                        <TableRow key={m.id} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={m.user?.image || ""} alt="" />
                                  <AvatarFallback className="text-xs font-medium">
                                    {(m.user?.name?.[0] || m.user?.email?.[0] || "U").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span
                                  className={cn(
                                    "ring-background absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2",
                                    isOnline ? "bg-chart-2" : "bg-muted-foreground/40"
                                  )}
                                  aria-hidden
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-foreground truncate font-medium">{name}</span>
                                  {m.role === "owner" ? (
                                    <Shield className="text-chart-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                                  ) : m.role === "admin" ? (
                                    <Shield className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
                                  ) : (
                                    <User2 className="text-chart-2 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                  )}
                                </div>
                                <div className="text-muted-foreground truncate text-xs lg:hidden">{m.user?.email || "—"}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden max-w-[220px] truncate text-sm lg:table-cell">
                            {m.user?.email || "—"}
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={m.role} label={roleLabel} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {isOnline ? (
                              <span className="text-chart-2 text-xs font-medium">Online</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Offline</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {m.role === "owner" ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : canAssignRoles || canRemove ? (
                              <div className="flex justify-end gap-1">
                                {canAssignRoles && (
                                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                    <Link href={href(`members/${m.id}/access`)}>Access</Link>
                                  </Button>
                                )}
                                {canRemove && (
                                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" asChild>
                                    <Link href={href(`members/${m.id}/remove`)} aria-label={`Remove ${name}`}>
                                      <UserMinus className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="divide-border/60 divide-y md:hidden">
                {members.map((m) => {
                  const isOnline = m.userId ? onlineUsers.has(m.userId) : false
                  const name = memberDisplayName(m)
                  const roleLabel = m.organization_role?.name || m.role
                  const showActions = (canAssignRoles || canRemove) && m.role !== "owner"
                  return (
                    <div key={m.id} className="flex gap-3 px-4 py-4 sm:px-6">
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={m.user?.image || ""} alt="" />
                          <AvatarFallback>{(m.user?.name?.[0] || m.user?.email?.[0] || "U").toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "ring-background absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2",
                            isOnline ? "bg-chart-2" : "bg-muted-foreground/40"
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="min-w-0">
                          <p className="text-foreground truncate font-medium">{name}</p>
                          {m.user?.email && (
                            <p className="text-muted-foreground truncate text-xs">{m.user.email}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <RoleBadge role={m.role} label={roleLabel} />
                            {isOnline ? (
                              <span className="text-chart-2 text-[10px] font-medium">Online</span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Offline</span>
                            )}
                          </div>
                        </div>
                        {showActions ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            {canAssignRoles && (
                              <Button variant="outline" size="sm" className="h-9 w-full text-xs sm:w-auto" asChild>
                                <Link href={href(`members/${m.id}/access`)}>Manage access</Link>
                              </Button>
                            )}
                            {canRemove && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 h-9 w-full text-xs sm:w-auto"
                                asChild
                              >
                                <Link href={href(`members/${m.id}/remove`)}>Remove</Link>
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canInvite && (
        <Card className="app-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Mail className="text-primary h-4 w-4" />
              Pending invitations
            </CardTitle>
            <CardDescription>Invite links that have not been accepted yet.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-0 sm:px-6">
            {invitations.length === 0 ? (
              <div className="text-muted-foreground px-4 py-10 text-center text-sm sm:px-6">
                No open invitations.
                <span className="mt-2 block">
                  <Button variant="link" className="h-auto p-0 text-primary" asChild>
                    <Link href={href("invite")}>Send an invite</Link>
                  </Button>
                </span>
              </div>
            ) : (
              <div className="divide-border/60 divide-y">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {invitation.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground truncate font-medium">{invitation.email}</span>
                          {isInvitationExpired(invitation.expiresAt) && (
                            <Badge variant="destructive" className="text-[10px]">
                              Expired
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Sent {formatDate(invitation.createdAt)} · Expires {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {invitation.ownershipTransfer ? (
                        <Badge variant="outline" className="border-chart-3/40 bg-chart-3/12 text-chart-3 gap-1 text-[10px]">
                          <Crown className="h-3 w-3" />
                          Ownership transfer
                        </Badge>
                      ) : (
                        <RoleBadge role={invitation.role} label={invitation.role} />
                      )}
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/25 h-8 text-xs" asChild>
                        <Link href={href(`invitations/${invitation.id}/cancel`)}>Cancel invite</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AppPageContainer>
  )
}
