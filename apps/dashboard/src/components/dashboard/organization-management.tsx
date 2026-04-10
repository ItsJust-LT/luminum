"use client"

import { useState, useEffect } from "react"
import { Building2, Users, Mail, Settings, MoreHorizontal, Crown, Shield, User, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { authClient } from "@/lib/auth/client"
import { OrganizationInviteDialog } from "@/components/dashboard/organization-invite-dialog"
import { AddClientToOrganizationDialog } from "@/components/dashboard/add-client-to-organization-dialog"
import { api } from "@/lib/api"

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: any
  createdAt: string | Date
}

interface Member {
  id: string
  userId: string
  organizationId: string
  role: string
  createdAt: string | Date
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

interface Invitation {
  id: string
  organizationId: string
  email: string
  role: string
  status: string
  inviterId: string
  expiresAt: string | Date
  createdAt?: string | Date
}

interface OrganizationManagementProps {
  onOrganizationChange?: () => void
}

export function OrganizationManagement({ onOrganizationChange }: OrganizationManagementProps) {
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [websites, setWebsites] = useState<any[]>([])
  const [pendingRemoveMember, setPendingRemoveMember] = useState<Member | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

  useEffect(() => {
    fetchActiveOrganization()
  }, [])

  const fetchActiveOrganization = async () => {
    try {
      const result = (await authClient.organization.getFullOrganization()) as { data?: { organization?: unknown; members?: unknown[]; invitations?: unknown[]; [key: string]: unknown } }
      if (result.data) {
        const orgData = result.data

        if (orgData.organization) {
          setActiveOrg(orgData.organization as Organization)
        } else {
          setActiveOrg(orgData as unknown as Organization)
        }

        const members = orgData.members || []
        const transformedMembers = members.map((member: any) => ({
          ...member,
          createdAt:
            typeof member.createdAt === "string"
              ? member.createdAt
              : member.createdAt?.toISOString() || new Date().toISOString(),
          user: {
            ...member.user,
            id: member.user.id || member.userId,
          },
        }))
        setMembers(transformedMembers)

        const invitations = orgData.invitations || []
        const transformedInvitations = invitations.map((invitation: any) => ({
          ...invitation,
          createdAt: invitation.createdAt
            ? typeof invitation.createdAt === "string"
              ? invitation.createdAt
              : invitation.createdAt.toISOString()
            : new Date().toISOString(),
          expiresAt:
            typeof invitation.expiresAt === "string"
              ? invitation.expiresAt
              : invitation.expiresAt?.toISOString() || new Date().toISOString(),
        }))
        setInvitations(transformedInvitations)

        const websites = (orgData as { metadata?: { websites?: unknown[] } }).metadata?.websites || []
        setWebsites(websites)
      }
    } catch (error: any) {
      console.error("Error fetching active organization:", error)
      setError("No active organization selected")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (member: any) => {
    setRemovingMember(true)
    try {
      const result = await api.organizationActions.removeMember({
        memberId: member.userId,
        memberEmail: member.user.email,
        memberName: member.user.name,
        organizationName: activeOrg?.name || "",
        organizationId: activeOrg?.id || "",
      })

      if (result.success) {
        setPendingRemoveMember(null)
        await fetchActiveOrganization()
      } else {
        console.error("Failed to remove member:", result.error)
        setError(result.error || "Failed to remove member")
      }
    } catch (error: any) {
      console.error("Error removing member:", error)
      setError("Failed to remove member")
    } finally {
      setRemovingMember(false)
    }
  }

  const handleUpdateMemberRole = async (userId: string, newRole: "admin" | "member") => {
    try {
      const result = await api.organizationActions.updateRole({
        memberId: userId,
        newRole: newRole,
        organizationId: activeOrg?.id || "",
      })

      if (result.success) {
        await fetchActiveOrganization()
      } else {
        console.error("Failed to update member role:", result.error)
        setError(result.error || "Failed to update member role")
      }
    } catch (error: any) {
      console.error("Error updating member role:", error)
      setError("Failed to update member role")
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await authClient.organization.cancelInvitation({
        invitationId,
      })
      await fetchActiveOrganization()
    } catch (error: any) {
      console.error("Error canceling invitation:", error)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            <Crown className="w-3 h-3 mr-1" />
            Owner
          </Badge>
        )
      case "admin":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case "member":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <User className="w-3 h-3 mr-1" />
            Client
          </Badge>
        )
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        )
      case "accepted":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Accepted
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDomainFromMetadata = (websites: any[]) => {
    if (websites && websites.length > 0) {
      return websites[0].domain // Return the actual stored domain
    }
    return `${activeOrg?.slug}.com` // Fallback
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading organization...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !activeOrg) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              {error || "No active organization selected. Please select an organization to manage."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Project Management</span>
            </CardTitle>
            <CardDescription>Manage {activeOrg.name} clients and settings</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <AddClientToOrganizationDialog
              organizationId={activeOrg.id}
              onClientAdded={fetchActiveOrganization}
              triggerButton={
                <Button variant="outline" className="bg-transparent">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              }
            />
            <OrganizationInviteDialog 
              organizationId={activeOrg?.id || ""} 
              organizationName={activeOrg?.name || ""}
              onInvitationSent={fetchActiveOrganization} 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clients">Clients ({members.length})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.user.image || ""} />
                      <AvatarFallback>{member.user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-medium text-gray-900">{member.user.name}</h4>
                        {getRoleBadge(member.role)}
                      </div>
                      <p className="text-sm text-gray-600">{member.user.email}</p>
                      <p className="text-xs text-gray-500">Added {formatDate(member.createdAt)}</p>
                    </div>
                  </div>

                  {member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role !== "admin" && (
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.userId, "admin")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {member.role === "admin" && (
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.userId, "member")}>
                            <User className="mr-2 h-4 w-4" />
                            Make Client
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setPendingRemoveMember(member)} className="text-red-600">
                          <Users className="mr-2 h-4 w-4" />
                          Remove Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                  <p className="text-gray-600">Invite clients to access this project!</p>
                </div>
              ) : (
                invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{invitation.email}</h4>
                        {getRoleBadge(invitation.role)}
                        {getStatusBadge(invitation.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Invited by ID: {invitation.inviterId}</span>
                        <span>Sent {invitation.createdAt ? formatDate(invitation.createdAt) : "Unknown"}</span>
                        <span>Expires {formatDate(invitation.expiresAt)}</span>
                      </div>
                    </div>

                    {invitation.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="bg-transparent"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Project Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{activeOrg.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Slug:</span>
                    <span className="text-sm font-medium">@{activeOrg.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Domains:</span>
                    <span className="text-sm font-medium">
                      {websites && websites.length > 0
                        ? websites.map((w) => w.domain).join(", ")
                        : "No domains configured"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium">{activeOrg.metadata?.type || "Website"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm font-medium">{formatDate(activeOrg.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Project
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Permissions
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    <AlertDialog open={pendingRemoveMember !== null} onOpenChange={(open) => !open && !removingMember && setPendingRemoveMember(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove client from organization?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the client from this organization and revokes access immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removingMember}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={removingMember || !pendingRemoveMember}
            onClick={(e) => {
              e.preventDefault()
              if (!pendingRemoveMember) return
              void handleRemoveMember(pendingRemoveMember)
            }}
          >
            {removingMember ? "Removing..." : "Remove client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
