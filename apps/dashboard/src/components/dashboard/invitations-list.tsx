"use client"

import { useState, useEffect } from "react"
import { Mail, Clock, CheckCircle, XCircle, MoreHorizontal, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authClient } from "@/lib/auth/client"

interface Invitation {
  id: string
  name: string
  email: string
  status: "pending" | "accepted" | "rejected" | "expired"
  createdAt: string
  expiresAt: string
}

export function InvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      const result = (await authClient.listInvitations({
        query: {
          limit: 50,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      })) as { data?: { invitations?: unknown[] } }

      if (result.data && Array.isArray(result.data.invitations)) {
        setInvitations(
          result.data.invitations.map((inv: any) => ({
            id: inv.id,
            name: inv.name ?? "",
            email: inv.email ?? "",
            status: inv.status === "canceled" ? "expired" : inv.status, // Map "canceled" to "expired" if needed
            createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : "",
            expiresAt: inv.expiresAt ? new Date(inv.expiresAt).toISOString() : "",
          }))
        )
      }
    } catch (error: any) {
      console.error("Error fetching invitations:", error)
      setError("Failed to load invitations")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await authClient.cancelInvitation({ invitationId })
      await fetchInvitations() // Refresh the list
    } catch (error: any) {
      console.error("Error canceling invitation:", error)
    }
  }

  const copyInvitationLink = (invitationId: string) => {
    const link = `${window.location.origin}/accept-invitation/${invitationId}`
    navigator.clipboard.writeText(link)
    // You could add a toast notification here
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "accepted":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invitations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <span>Recent Invitations</span>
        </CardTitle>
        <CardDescription>Manage and track your sent invitations</CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations yet</h3>
            <p className="text-gray-600">Start by inviting your first team member!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{invitation.name}</h4>
                    {getStatusBadge(invitation.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{invitation.email}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Sent {formatDate(invitation.createdAt)}</span>
                    <span>Expires {formatDate(invitation.expiresAt)}</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copyInvitationLink(invitation.id)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </DropdownMenuItem>
                    {invitation.status === "pending" && (
                      <DropdownMenuItem onClick={() => handleCancelInvitation(invitation.id)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancel
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
