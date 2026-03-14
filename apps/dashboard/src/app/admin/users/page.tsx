"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  RefreshCw,
  AlertCircle,
  Building2,
  Shield,
  UserX,
  UserCheck,
  Crown,
} from "lucide-react"
import { getAllUsersWithDetails, getUserStats, deactivateUser } from "@/lib/actions/user-management"
import { reactivateUser } from "@/lib/actions/admin-actions"
import { formatDate, formatNumber } from "@/lib/utils"
import { toast } from "sonner"
import { authClient } from "@/lib/auth/client"

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stats, setStats] = useState<any>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; userName: string } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, statsRes] = await Promise.all([
        getAllUsersWithDetails(),
        getUserStats(),
      ])
      if (usersRes.success) setUsers(usersRes.users || [])
      else setError(usersRes.error || "Failed to load users")
      if (statsRes.success) setStats(statsRes.stats)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleBan = async (userId: string) => {
    try {
      const res = await deactivateUser(userId, "Banned by admin")
      if (res.success) {
        toast.success("User banned")
        fetchData()
      } else {
        toast.error(res.error || "Failed to ban user")
      }
    } catch { toast.error("Failed to ban user") }
    setConfirmAction(null)
  }

  const handleUnban = async (userId: string) => {
    try {
      const res = await reactivateUser(userId)
      if (res.success) {
        toast.success("User reactivated")
        fetchData()
      } else {
        toast.error(res.error || "Failed to reactivate")
      }
    } catch { toast.error("Failed to reactivate") }
    setConfirmAction(null)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await authClient.admin.setRole({ userId, role: newRole })
      toast.success(`Role changed to ${newRole}`)
      fetchData()
    } catch { toast.error("Failed to change role") }
  }

  const filtered = users.filter((user) => {
    const matchesSearch = !search.trim() ||
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" ||
      (roleFilter === "admin" && user.role === "admin") ||
      (roleFilter === "user" && user.role !== "admin")
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && !user.banned) ||
      (statusFilter === "banned" && user.banned)
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (user: any) => {
    if (user.role === "admin") {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>
    }
    return <Badge variant="secondary" className="text-xs">User</Badge>
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all users on the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 self-start">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.adminUsers)}</p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{formatNumber(stats.bannedUsers)}</p>
                  <p className="text-xs text-muted-foreground">Banned</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                  <UserX className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(stats.recentUsers)}</p>
                  <p className="text-xs text-muted-foreground">Last 30 Days</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                  <UserCheck className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organizations</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.image || ""} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{user.member?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user._count?.session || 0}</TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Banned</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(user.createdAt, { relative: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}`}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.role !== "admin" ? (
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "admin")}>
                              <Crown className="h-4 w-4 mr-2" /> Make Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "user")}>
                              <Users className="h-4 w-4 mr-2" /> Remove Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.banned ? (
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "unban", userId: user.id, userName: user.name || user.email })}>
                              <UserCheck className="h-4 w-4 mr-2" /> Reactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setConfirmAction({ type: "ban", userId: user.id, userName: user.name || user.email })}
                            >
                              <UserX className="h-4 w-4 mr-2" /> Ban User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search || roleFilter !== "all" || statusFilter !== "all" ? "No users match your filters" : "No users yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "ban" ? "Ban User" : "Reactivate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "ban"
                ? `Are you sure you want to ban "${confirmAction?.userName}"? They will lose access to the platform.`
                : `Are you sure you want to reactivate "${confirmAction?.userName}"? They will regain access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction?.type === "ban") handleBan(confirmAction.userId)
                else if (confirmAction?.type === "unban") handleUnban(confirmAction!.userId)
              }}
              className={confirmAction?.type === "ban" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmAction?.type === "ban" ? "Ban User" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
