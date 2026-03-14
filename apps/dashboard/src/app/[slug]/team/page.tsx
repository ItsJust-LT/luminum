"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useOrganization } from "@/lib/contexts/organization-context"
import { authClient } from "@/lib/auth/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Shield, User2, UserMinus, Mail, X } from "lucide-react"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { OrganizationInviteDialog } from "@/components/dashboard/organization-invite-dialog"
import { RemoveMemberDialog } from "@/components/dashboard/remove-member-dialog"
import { CancelInvitationDialog } from "@/components/dashboard/cancel-invitation-dialog"
import { getOrganizationInvitations } from "@/lib/actions/organization-actions"
import { TeamSkeleton } from "@/components/ui/team-skeleton"

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
}

interface OrganizationInvitation {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt: string
  inviterId?: string | null
}

export default function TeamPage() {
  const router = useRouter()
  const { organization, userRole, loading: orgLoading, error: orgError } = useOrganization()
  const { onlineUsers } = useRealtime()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<OrganizationInvitation | null>(null)

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchMembers()
      fetchInvitations()
    }
  }, [orgLoading, organization?.id])

  const fetchMembers = async () => {
    if (!organization) return
    try {
      setLoading(true)
      const result = await (authClient as unknown as { organization: { getFullOrganization: (opts?: { query?: { organizationId?: string; membersLimit?: number } }) => Promise<unknown> } }).organization.getFullOrganization({
        query: {
          organizationId: organization.id,
          membersLimit: 200,
        },
      })
      const typedResult = result as { error?: { message?: string }; data?: { members?: unknown[] } }
      if (typedResult.error) throw new Error(typedResult.error.message)

      const data = typedResult.data as any
      setMembers((data?.members || []) as OrganizationMember[])
    } catch (error) {
      console.error("Failed to load members:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    if (!organization) return
    try {
      const result = await getOrganizationInvitations(organization.id)
      if (result.success) {
        setInvitations(result.invitations || [])
      } else {
        console.error("Failed to load invitations:", result.error)
      }
    } catch (error) {
      console.error("Failed to load invitations:", error)
    }
  }

  const handleRemoveMember = (member: OrganizationMember) => {
    setSelectedMember(member)
    setRemoveDialogOpen(true)
  }

  const handleCloseRemoveDialog = () => {
    setRemoveDialogOpen(false)
    setSelectedMember(null)
  }

  const handleMemberRemoved = () => {
    fetchMembers() // Refresh the members list
  }

  const handleCancelInvitation = (invitation: OrganizationInvitation) => {
    setSelectedInvitation(invitation)
    setCancelDialogOpen(true)
  }

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false)
    setSelectedInvitation(null)
  }

  const handleInvitationCancelled = () => {
    fetchInvitations() // Refresh the invitations list
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30" variant="secondary">owner</Badge>
      case "admin":
        return <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30" variant="secondary">admin</Badge>
      default:
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30" variant="secondary">member</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isInvitationExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (orgLoading || loading) {
    return (
      <AppPageContainer>
        <TeamSkeleton />
      </AppPageContainer>
    )
  }

  if (orgError || !organization) {
    return (
      <AppPageContainer className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md app-card">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Team</CardTitle>
            <CardDescription>{orgError || "Organization not found"}</CardDescription>
          </CardHeader>
        </Card>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 bg-primary/10 rounded-xl shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">Team</h1>
            <p className="text-muted-foreground text-sm truncate">Members of {organization.name}</p>
          </div>
        </div>
        {(userRole === "owner" || userRole === "admin") && (
          <OrganizationInviteDialog
            organizationId={organization.id}
            organizationName={organization.name}
            onInvitationSent={() => {
              fetchMembers()
              fetchInvitations()
            }}
          />
        )}
      </div>

      <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base font-semibold">Members</CardTitle>
          <CardDescription>View team members and their roles</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {members.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-muted-foreground text-sm">No members found.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {members.map((m) => {
                const isOnline = m.userId ? onlineUsers.has(m.userId) : false
                return (
                <div key={m.id} className="flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.user?.image || ""} />
                      <AvatarFallback>{(m.user?.name?.[0] || m.user?.email?.[0] || "U").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background ${isOnline ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{m.user?.name || m.user?.email || "User"}</span>
                      {m.role === "owner" ? <Shield className="h-4 w-4 text-violet-500" /> : m.role === "admin" ? <Shield className="h-4 w-4 text-slate-500" /> : <User2 className="h-4 w-4 text-emerald-500" />}
                      {isOnline && <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Online</span>}
                    </div>
                    {m.user?.email && (
                      <div className="text-xs text-muted-foreground truncate">{m.user.email}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(m.role)}
                    {/* Only show remove button for admins/owners, and don't allow removing owners */}
                    {(userRole === "owner" || userRole === "admin") && m.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Card */}
      {(userRole === "owner" || userRole === "admin") && (
        <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Invitations waiting to be accepted</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {invitations.length === 0 ? (
              <div className="py-6 sm:py-8 text-center text-muted-foreground text-sm">No pending invitations.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {invitation.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {invitation.email}
                        </span>
                        {isInvitationExpired(invitation.expiresAt) && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Sent: {formatDate(invitation.createdAt)}</p>
                        <p>Expires: {formatDate(invitation.expiresAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getRoleBadge(invitation.role)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation)}
                        className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remove Member Dialog */}
      {selectedMember && (
        <RemoveMemberDialog
          isOpen={removeDialogOpen}
          onClose={handleCloseRemoveDialog}
          member={{
            id: selectedMember.userId,
            name: selectedMember.user?.name || selectedMember.user?.email || "User",
            email: selectedMember.user?.email || "",
            role: selectedMember.role,
          }}
          organizationName={organization.name}
          organizationId={organization.id}
          onMemberRemoved={handleMemberRemoved}
        />
      )}

      {/* Cancel Invitation Dialog */}
      {selectedInvitation && (
        <CancelInvitationDialog
          isOpen={cancelDialogOpen}
          onClose={handleCloseCancelDialog}
          invitation={{
            id: selectedInvitation.id,
            email: selectedInvitation.email,
            role: selectedInvitation.role,
            createdAt: selectedInvitation.createdAt,
            expiresAt: selectedInvitation.expiresAt,
          }}
          onInvitationCancelled={handleInvitationCancelled}
        />
      )}
    </AppPageContainer>
  )
}


