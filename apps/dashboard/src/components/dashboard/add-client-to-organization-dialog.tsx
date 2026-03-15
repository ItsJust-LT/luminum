"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { UserPlus, Search, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"

interface ExistingUser {
  id: string
  name: string
  email: string
  image?: string
  role: string
  emailVerified: boolean
}

interface AddClientToOrganizationDialogProps {
  organizationId: string
  onClientAdded?: () => void
  triggerButton?: React.ReactNode
}

export function AddClientToOrganizationDialog({
  organizationId,
  onClientAdded,
  triggerButton,
}: AddClientToOrganizationDialogProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<ExistingUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member")
  const [users, setUsers] = useState<ExistingUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const availableRoles = [
    { id: "member" as const, label: "Client", description: "Basic access to project dashboard" },
    { id: "admin" as const, label: "Admin", description: "Full project management access" },
  ]

  const resetForm = () => {
    setSearchTerm("")
    setSelectedUser(null)
    setSelectedRole("member")
    setUsers([])
    setError("")
    setSuccess(false)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(resetForm, 300)
  }

  const searchUsers = async (term: string) => {
    if (term.length < 2) {
      setUsers([])
      return
    }

    setIsSearching(true)
    setError("")

    try {
      const result = (await authClient.admin.listUsers({
        query: {
          limit: 20,
          sortBy: "name",
          sortDirection: "asc",
        },
      })) as { data?: { users?: Array<{ id: string; name: string; email: string; image?: string | null; role?: string; emailVerified?: boolean }> } }

      if (result.data && result.data.users) {
        // Filter users by search term and exclude admins
        const filteredUsers = result.data.users
          .filter((user) => {
            const userRole = user.role || "user"
            const matchesSearch =
              user.name.toLowerCase().includes(term.toLowerCase()) ||
              user.email.toLowerCase().includes(term.toLowerCase())
            const isNotAdmin = userRole !== "admin"
            return matchesSearch && isNotAdmin
          })
          .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? undefined,
            role: user.role || "user",
            emailVerified: user.emailVerified ?? false,
          }))

        setUsers(filteredUsers.slice(0, 10)) // Limit to 10 results
      } else {
        setUsers([])
      }
    } catch (error: any) {
      console.error("Error searching users:", error)
      setError("Failed to search users. Please try again.")
      setUsers([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers(searchTerm.trim())
      } else {
        setUsers([])
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  const handleAddClient = async () => {
    if (!selectedUser || !organizationId) {
      setError("Please select a user and ensure organization is selected")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Adding client to organization:", {
        userId: selectedUser.id,
        role: selectedRole,
        organizationId: organizationId,
        userName: selectedUser.name,
      })

      const result = await api.organizationActions.addMember({
        email: selectedUser.email,
        role: selectedRole as "admin" | "member",
        organizationId: organizationId,
      })

      console.log("Add client result:", result)

      if (result.success) {
        setSuccess(true)
        onClientAdded?.()

        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        throw new Error(result.error || "Failed to add client to organization")
      }
    } catch (error: any) {
      console.error("Add client error:", error)
      setError(error.message || "Failed to add client to organization")
    } finally {
      setIsLoading(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" className="bg-transparent">
      <UserPlus className="w-4 h-4 mr-2" />
      Add Existing Client
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <span>Add Existing Client</span>
          </DialogTitle>
          <DialogDescription>
            Add an existing user to this project. They'll get access to the project dashboard with the selected role.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Client Added!</h3>
            <p className="text-gray-600">
              <strong>{selectedUser?.name}</strong> has been added to this project as a <strong>{selectedRole}</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                Search Users
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>

            {searchTerm && users.length === 0 && !isSearching && (
              <div className="text-center py-4 text-gray-500">
                <p>No users found matching "{searchTerm}"</p>
              </div>
            )}

            {users.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select User</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || ""} />
                        <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          {!user.emailVerified && (
                            <Badge variant="outline" className="text-xs">
                              Unverified
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{user.email}</p>
                      </div>
                      {selectedUser?.id === user.id && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Role in Project</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as "admin" | "member")}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-xs text-gray-500">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddClient}
                disabled={isLoading || !selectedUser || !organizationId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add as {availableRoles.find((r) => r.id === selectedRole)?.label || selectedRole}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
