"use client"

import { useState, useEffect } from "react"
import { Users, Search, MoreHorizontal, Shield, Ban, UserCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authClient } from "@/lib/auth/client"

interface User {
  id: string
  name: string
  email: string
  role: string
  image?: string
  banned: boolean
  createdAt: string
  emailVerified: boolean
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const result = (await authClient.admin.listUsers({
        query: {
          limit: 50,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      })) as { data?: { users?: unknown[] } }

      if (result.data) {
        setUsers(
          (result.data.users as any[]).filter((u): u is User => typeof u.role === "string")
            .map((u) => ({
              ...u,
              role: u.role ?? "user", // fallback to "user" if role is undefined
            }))
        )
      }
    } catch (error: any) {
      console.error("Error fetching users:", error)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handleSetRole = async (userId: string, role: "user" | "admin") => {
    try {
      await authClient.admin.setRole({
        userId,
        role,
      })
      await fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error("Error setting role:", error)
    }
  }

  const handleBanUser = async (userId: string) => {
    try {
      await authClient.admin.banUser({
        userId,
        banReason: "Banned by admin",
      })
      await fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error("Error banning user:", error)
    }
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      await authClient.admin.unbanUser({
        userId,
      })
      await fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error("Error unbanning user:", error)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (confirm("Are you sure you want to permanently delete this user?")) {
      try {
        await authClient.admin.removeUser({
          userId,
        })
        await fetchUsers() // Refresh the list
      } catch (error: any) {
        console.error("Error removing user:", error)
      }
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case "user":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <UserCheck className="w-3 h-3 mr-1" />
            User
          </Badge>
        )
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
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
            <p className="text-gray-600">Loading users...</p>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>User Management</span>
        </CardTitle>
        <CardDescription>Manage system users and their permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">No users match your search criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <Avatar>
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium text-gray-900">{user.name}</h4>
                      {getRoleBadge(user.role)}
                      {user.banned && (
                        <Badge variant="destructive">
                          <Ban className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                      {!user.emailVerified && <Badge variant="outline">Unverified</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                    <p className="text-xs text-gray-500">Joined {formatDate(user.createdAt)}</p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.role !== "admin" && (
                      <DropdownMenuItem onClick={() => handleSetRole(user.id, "admin")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    {user.role === "admin" && (
                      <DropdownMenuItem onClick={() => handleSetRole(user.id, "user")}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Make User
                      </DropdownMenuItem>
                    )}
                    {!user.banned ? (
                      <DropdownMenuItem onClick={() => handleBanUser(user.id)} className="text-orange-600">
                        <Ban className="mr-2 h-4 w-4" />
                        Ban User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleUnbanUser(user.id)} className="text-green-600">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Unban User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleRemoveUser(user.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
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
