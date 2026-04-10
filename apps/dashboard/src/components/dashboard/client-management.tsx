"use client"

import { useState, useEffect } from "react"
import { Users, Search, MoreHorizontal, Ban, UserCheck, Trash2, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

interface Client {
  id: string
  name: string
  email: string
  role: string
  image?: string
  banned: boolean
  createdAt: string
  emailVerified: boolean
  lastLogin?: string
  websiteCount?: number
}

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingRemoveClientId, setPendingRemoveClientId] = useState<string | null>(null)
  const [removingClient, setRemovingClient] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const result = (await authClient.admin.listUsers({
        query: {
          limit: 50,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      })) as { data?: { users?: Array<{ id: string; name: string; email: string; role?: string; image?: string | null; banned?: boolean; createdAt?: Date | string; emailVerified?: boolean }> } }

      if (result.data) {
        // Filter out admin users and transform the data to match Client interface
        const clientUsers = (result.data.users ?? [])
          .filter((user) => (user.role || "user") !== "admin")
          .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || "user", // Provide default value for undefined role
            image: user.image ?? undefined,
            banned: !!user.banned,
            createdAt: typeof user.createdAt === "string" ? user.createdAt : user.createdAt?.toISOString?.() ?? "",
            emailVerified: user.emailVerified ?? false,
            websiteCount: 0, // Default value, could be calculated from actual data
          }))
        setClients(clientUsers)
      }
    } catch (error: any) {
      console.error("Error fetching clients:", error)
      setError("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

  const handleBanClient = async (userId: string) => {
    try {
      await authClient.admin.banUser({
        userId,
        banReason: "Banned by agency admin",
      })
      await fetchClients() // Refresh the list
    } catch (error: any) {
      console.error("Error banning client:", error)
    }
  }

  const handleUnbanClient = async (userId: string) => {
    try {
      await authClient.admin.unbanUser({
        userId,
      })
      await fetchClients() // Refresh the list
    } catch (error: any) {
      console.error("Error unbanning client:", error)
    }
  }

  const handleRemoveClient = async (userId: string) => {
    setRemovingClient(true)
    try {
      await authClient.admin.removeUser({
        userId,
      })
      setPendingRemoveClientId(null)
      await fetchClients() // Refresh the list
    } catch (error: any) {
      console.error("Error removing client:", error)
    } finally {
      setRemovingClient(false)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getClientStatusBadge = (client: Client) => {
    if (client.banned) {
      return (
        <Badge variant="destructive">
          <Ban className="w-3 h-3 mr-1" />
          Banned
        </Badge>
      )
    }
    if (!client.emailVerified) {
      return <Badge variant="outline">Unverified</Badge>
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        <UserCheck className="w-3 h-3 mr-1" />
        Active
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading clients...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>Client Management</span>
        </CardTitle>
        <CardDescription>Manage your agency's clients and their access</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600">No clients match your search criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <Avatar>
                    <AvatarImage src={client.image || ""} />
                    <AvatarFallback>{client.name?.charAt(0).toUpperCase() || "C"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium text-gray-900">{client.name}</h4>
                      {getClientStatusBadge(client)}
                      {client.websiteCount && client.websiteCount > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Globe className="w-3 h-3 mr-1" />
                          {client.websiteCount} websites
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{client.email}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Joined {formatDate(client.createdAt)}</span>
                      {client.lastLogin && <span>Last login {formatDate(client.lastLogin)}</span>}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Globe className="mr-2 h-4 w-4" />
                      View Websites
                    </DropdownMenuItem>
                    {!client.banned ? (
                      <DropdownMenuItem onClick={() => handleBanClient(client.id)} className="text-orange-600">
                        <Ban className="mr-2 h-4 w-4" />
                        Ban Client
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleUnbanClient(client.id)} className="text-green-600">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Unban Client
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setPendingRemoveClientId(client.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    <AlertDialog open={pendingRemoveClientId !== null} onOpenChange={(open) => !open && !removingClient && setPendingRemoveClientId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove client account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the client account and access. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removingClient}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={removingClient || !pendingRemoveClientId}
            onClick={(e) => {
              e.preventDefault()
              if (!pendingRemoveClientId) return
              void handleRemoveClient(pendingRemoveClientId)
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removingClient ? "Removing..." : "Remove client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
