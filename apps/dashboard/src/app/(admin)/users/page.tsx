"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Settings,
  Plus,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Shield,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  TrendingDown,
  Crown,
  Star,
  Zap
} from "lucide-react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  image?: string
  role?: string
  createdAt: string
  lastLoginAt?: string
  isActive?: boolean
  members?: any[]
  totalSpent?: number
  totalTransactions?: number
  successfulTransactions?: number
  failedTransactions?: number
  averageTransactionValue?: number
  recentTransactions?: any[]
  subscriptionCount?: number
  organizationCount?: number
  primaryRole?: string
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  totalRevenue: number
  averageSpend: number
  adminUsers: number
  regularUsers: number
  ownerCount: number
  memberCount: number
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchField, setSearchField] = useState<"email" | "name">("email")
  const [searchOperator, setSearchOperator] = useState<"contains" | "starts_with" | "ends_with">("contains")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    totalRevenue: 0,
    averageSpend: 0,
    adminUsers: 0,
    regularUsers: 0,
    ownerCount: 0,
    memberCount: 0
  })

  const fetchUsers = async (page: number = currentPage) => {
    try {
      setLoading(true)
      setError(null)
      
      const offset = (page - 1) * pageSize
      
      // Build query parameters
      const queryParams: any = {
        limit: pageSize,
        offset,
        sortBy,
        sortDirection: sortOrder
      }

      // Add search parameters if search is provided
      if (search.trim()) {
        queryParams.searchValue = search.trim()
        queryParams.searchField = searchField
        queryParams.searchOperator = searchOperator
      }

      // Add role filter if not "all"
      if (roleFilter !== "all") {
        queryParams.filterField = "role"
        queryParams.filterValue = roleFilter
        queryParams.filterOperator = "eq"
      }

      // Fetch users and stats in parallel
      const [usersResult, statsResult] = await Promise.all([
        api.userManagement.getUsers(),
        api.userManagement.getStats()
      ])
      
      const usersData = usersResult as { success?: boolean; users?: User[]; data?: User[]; pagination?: any; error?: string }
      if (usersData.success) {
        const list = usersData.users ?? usersData.data ?? []
        setUsers(list)
        if (usersData.pagination) {
          setPagination(usersData.pagination)
        }
      } else {
        setError(usersData.error || "Failed to fetch users")
      }

      const statsData = statsResult as { success?: boolean; stats?: UserStats; data?: UserStats }
      if (statsData.success && (statsData.stats || statsData.data)) {
        setStats(statsData.stats ?? statsData.data!)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Refetch users when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1) // Reset to first page when filters change
      fetchUsers(1)
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [search, searchField, searchOperator, roleFilter, statusFilter, sortBy, sortOrder, pageSize])

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchUsers(page)
  }

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    fetchUsers(1)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { status: "Admin", color: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200", icon: Crown }
      case "owner":
        return { status: "Owner", color: "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200", icon: Star }
      case "member":
        return { status: "Member", color: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200", icon: UserCheck }
      default:
        return { status: "User", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: Users }
    }
  }

  const getStatusBadge = (user: User) => {
    if (!user.isActive) {
      return { status: "Inactive", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: UserX }
    }
    
    const lastLogin = new Date(user.lastLoginAt || "")
    const now = new Date()
    const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceLogin <= 7) {
      return { status: "Active", color: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200", icon: UserCheck }
    } else if (daysSinceLogin <= 30) {
      return { status: "Recent", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200", icon: Clock }
    } else {
      return { status: "Inactive", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: UserX }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }


  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(user => user.id))
    }
  }

  const handleBulkAction = (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error("Please select users first")
      return
    }
    
    switch (action) {
      case "export":
        toast.success(`Exporting ${selectedUsers.length} users...`)
        break
      case "activate":
        toast.success(`Activating ${selectedUsers.length} users...`)
        break
      case "deactivate":
        toast.success(`Deactivating ${selectedUsers.length} users...`)
        break
      default:
        toast.error("Action not implemented yet")
    }
  }

  const roles = Array.from(new Set(users.map(user => user.role || user.primaryRole).filter(Boolean))).sort() as string[]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Manage and monitor all system users (excluding admins)
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => fetchUsers()}
              disabled={loading}
              size="sm"
              className="shrink-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" className="shrink-0">
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add User</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-5 mb-8">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Users</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
             <CardContent>
               <div className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">
                 {loading ? <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : stats.totalUsers}
               </div>
             </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Active Users</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
             <CardContent>
               <div className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">
                 {loading ? <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : stats.activeUsers}
               </div>
             </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">New This Month</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
             <CardContent>
               <div className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">
                 {loading ? <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : stats.newUsersThisMonth}
               </div>
             </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Revenue</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
             <CardContent>
               <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-orange-700 dark:text-orange-300">
                 {loading ? <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" /> : formatCurrency(stats.totalRevenue, 'ZAR')}
               </div>
             </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-700 dark:text-teal-300">Avg. Spend</CardTitle>
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
            </CardHeader>
             <CardContent>
               <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-teal-700 dark:text-teal-300">
                 {loading ? <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" /> : formatCurrency(stats.averageSpend, 'ZAR')}
               </div>
             </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
           <CardContent>
             <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
               <div className="sm:col-span-2 lg:col-span-2">
                 <Label htmlFor="search">Search Users</Label>
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                   <Input
                     id="search"
                     placeholder="Search by name or email..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="pl-10"
                   />
                 </div>
               </div>
              
              <div>
                <Label htmlFor="searchField">Search Field</Label>
                <Select value={searchField} onValueChange={(value: "email" | "name") => setSearchField(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="searchOperator">Search Type</Label>
                <Select value={searchOperator} onValueChange={(value: "contains" | "starts_with" | "ends_with") => setSearchOperator(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="starts_with">Starts With</SelectItem>
                    <SelectItem value="ends_with">Ends With</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sort">Sort By</Label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('-')
                  setSortBy(field)
                  setSortOrder(order as "asc" | "desc")
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                    <SelectItem value="email-desc">Email (Z-A)</SelectItem>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="lastLogin-desc">Recent Login</SelectItem>
                    <SelectItem value="spend-desc">Highest Spend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t">
               <div className="flex items-center gap-4">
                 <Label htmlFor="pageSize">Page Size</Label>
                 <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                   <SelectTrigger className="w-20">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="25">25</SelectItem>
                     <SelectItem value="50">50</SelectItem>
                     <SelectItem value="100">100</SelectItem>
                     <SelectItem value="200">200</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               
               <div className="text-sm text-muted-foreground text-center sm:text-right">
                 Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} users
               </div>
             </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
           <CardContent className="py-4">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-sm font-medium">
                   {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                 </span>
               </div>
               <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("export")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("activate")}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("deactivate")}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Deactivate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
           <CardHeader>
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <div>
                 <CardTitle>Users ({pagination.total})</CardTitle>
                 <CardDescription>
                   {selectedUsers.length > 0 && `${selectedUsers.length} selected`}
                 </CardDescription>
               </div>
               <div className="flex items-center gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={handleSelectAll}
                 >
                   {selectedUsers.length === users.length ? "Deselect All" : "Select All"}
                 </Button>
               </div>
             </div>
           </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/6" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => fetchUsers()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground mb-4">
                  {search || roleFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters or search terms."
                    : "No users have been created yet."}
                </p>
                {!search && roleFilter === "all" && statusFilter === "all" && (
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add First User
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {users.map((user) => {
                  const roleInfo = getRoleBadge(user.role || user.primaryRole || "user")
                  const statusInfo = getStatusBadge(user)
                  const isSelected = selectedUsers.includes(user.id)
                  const RoleIcon = roleInfo.icon
                  const StatusIcon = statusInfo.icon
                  
                  return (
                     <div
                       key={user.id}
                       className={`flex flex-col lg:flex-row lg:items-center gap-4 p-4 border rounded-lg transition-all hover:shadow-md ${
                         isSelected ? "border-primary bg-primary/5" : "border-border"
                       }`}
                     >
                       <div className="flex items-center space-x-4 flex-1">
                         <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={() => handleSelectUser(user.id)}
                           className="rounded border-border shrink-0"
                         />
                         
                         <Avatar className="h-12 w-12 shrink-0">
                           <AvatarImage src={user.image || ""} />
                           <AvatarFallback className="bg-primary/10 text-primary font-bold">
                             {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                           </AvatarFallback>
                         </Avatar>
                         
                         <div className="flex-1 min-w-0">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                             <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
                             <div className="flex items-center gap-2 flex-wrap">
                               <Badge className={`text-xs ${roleInfo.color}`}>
                                 <RoleIcon className="w-3 h-3 mr-1" />
                                 {roleInfo.status}
                               </Badge>
                               <Badge className={`text-xs ${statusInfo.color}`}>
                                 <StatusIcon className="w-3 h-3 mr-1" />
                                 {statusInfo.status}
                               </Badge>
                             </div>
                           </div>
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                             <div className="flex items-center gap-1">
                               <Mail className="w-3 h-3" />
                               <span className="truncate">{user.email}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <Calendar className="w-3 h-3" />
                               Joined {formatDate(user.createdAt || "")}
                             </div>
                             <div className="flex items-center gap-1">
                               <Activity className="w-3 h-3" />
                               Last login {formatDate(user.lastLoginAt || "")}
                             </div>
                           </div>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm lg:max-w-md">
                         <div>
                           <div className="font-medium text-foreground text-green-600 dark:text-green-400">
                             {formatCurrency(user.totalSpent || 0, 'ZAR')}
                           </div>
                           <div className="text-muted-foreground text-xs">
                             Total spent
                           </div>
                         </div>
                         <div>
                           <div className="font-medium text-foreground">
                             {user.totalTransactions || 0}
                           </div>
                           <div className="text-muted-foreground text-xs">
                             Transactions
                           </div>
                         </div>
                         <div>
                           <div className="font-medium text-foreground text-green-600 dark:text-green-400">
                             {user.successfulTransactions || 0}
                           </div>
                           <div className="text-muted-foreground text-xs">
                             Successful
                           </div>
                         </div>
                         <div>
                           <div className="font-medium text-foreground">
                             {user.organizationCount || 0}
                           </div>
                           <div className="text-muted-foreground text-xs">
                             Organizations
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-2 shrink-0">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => router.push(`/admin/users/${user.id}`)}
                           className="flex-1 sm:flex-none"
                         >
                           <Eye className="w-4 h-4 sm:mr-2" />
                           <span className="hidden sm:inline">View</span>
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           className="flex-1 sm:flex-none"
                         >
                           <Edit className="w-4 h-4 sm:mr-2" />
                           <span className="hidden sm:inline">Edit</span>
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           className="flex-1 sm:flex-none"
                         >
                           <MoreHorizontal className="w-4 h-4" />
                         </Button>
                       </div>
                     </div>
                  )
                })}
                </div>
                
                 {/* Pagination Controls */}
                 {pagination.totalPages > 1 && (
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t">
                     <div className="flex items-center justify-center sm:justify-start gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handlePageChange(currentPage - 1)}
                         disabled={!pagination.hasPreviousPage}
                       >
                         Previous
                       </Button>
                       
                       <div className="flex items-center gap-1">
                         {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                           const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i
                           if (pageNum > pagination.totalPages) return null
                           
                           return (
                             <Button
                               key={pageNum}
                               variant={pageNum === currentPage ? "default" : "outline"}
                               size="sm"
                               onClick={() => handlePageChange(pageNum)}
                               className="w-8 h-8 p-0"
                             >
                               {pageNum}
                             </Button>
                           )
                         })}
                       </div>
                       
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handlePageChange(currentPage + 1)}
                         disabled={!pagination.hasNextPage}
                       >
                         Next
                       </Button>
                     </div>
                     
                     <div className="text-sm text-muted-foreground text-center sm:text-right">
                       Page {currentPage} of {pagination.totalPages}
                     </div>
                   </div>
                 )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
