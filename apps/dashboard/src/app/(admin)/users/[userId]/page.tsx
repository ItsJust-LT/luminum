"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft,
  Mail,
  Calendar,
  Building2,
  DollarSign,
  Users,
  Activity,
  Settings,
  Edit,
  Trash2,
  Shield,
  Crown,
  Star,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  CreditCard,
  Globe,
  Phone,
  MapPin
} from "lucide-react"
import { getUserById } from "@/lib/actions/user-management"
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
  subscriptionData?: any[]
  totalSpent: number
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  averageTransactionValue: number
  recentTransactions: any[]
  activeSubscriptions: number
  organizationCount: number
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getUserById(userId)
      
      if (result.success) {
        setUser(result.data || null)
      } else {
        setError(result.error || "Failed to fetch user")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Error fetching user:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUser()
    }
  }, [userId])

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center space-y-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-48 mb-4" />
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push("/admin/users")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const roleInfo = getRoleBadge(user.role || "user")
  const RoleIcon = roleInfo.icon

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/users")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{user.name}</h1>
              <p className="text-muted-foreground">User Details & Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                  
                  <Badge className={`${roleInfo.color} flex items-center gap-1`}>
                    <RoleIcon className="w-3 h-3" />
                    {roleInfo.status}
                  </Badge>
                  
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={user.isActive ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Organizations:</span>
                      <span className="font-medium">{user.organizationCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Spent:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(user.totalSpent, 'ZAR')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active Subscriptions:</span>
                      <span className="font-medium">{user.activeSubscriptions}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="organizations">Organizations</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      User Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Joined</p>
                          <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Last Login</p>
                          <p className="text-sm text-muted-foreground">
                            {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Role</p>
                          <p className="text-sm text-muted-foreground capitalize">{user.role || "user"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {formatCurrency(user.totalSpent, 'ZAR')}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">Total Spent</p>
                      </div>
                      
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {user.totalTransactions}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Total Transactions</p>
                      </div>
                      
                      <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                        <UserCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {user.successfulTransactions}
                        </p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">Successful</p>
                      </div>
                      
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {formatCurrency(user.averageTransactionValue, 'ZAR')}
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Avg. Transaction</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {user.organizationCount}
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-400">Organizations</p>
                      </div>
                      
                      <div className="text-center p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
                        <CreditCard className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                          {user.activeSubscriptions}
                        </p>
                        <p className="text-sm text-cyan-600 dark:text-cyan-400">Active Subscriptions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="organizations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Organizations ({user.members?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.members && user.members.length > 0 ? (
                      <div className="space-y-4">
                        {user.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.organization?.logo || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {member.organization?.name?.[0]?.toUpperCase() || "O"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.organization?.name}</p>
                                <p className="text-sm text-muted-foreground">@{member.organization?.slug}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={member.role === "owner" ? "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200" : "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"}>
                                {member.role}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/${member.organization?.slug}/dashboard`)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No organizations found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Subscriptions ({user.subscriptionData?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.subscriptionData && user.subscriptionData.length > 0 ? (
                      <div className="space-y-4">
                        {user.subscriptionData.map((subscription) => (
                          <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{subscription.plan_name || "Unknown Plan"}</p>
                              <p className="text-sm text-muted-foreground">
                                {subscription.type} • {subscription.currency}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(subscription.amount, 'ZAR')}</p>
                              <Badge className={subscription.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}>
                                {subscription.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No subscriptions found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Recent Transactions ({user.recentTransactions?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.recentTransactions && user.recentTransactions.length > 0 ? (
                      <div className="space-y-4">
                        {user.recentTransactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">Transaction #{transaction.reference}</p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.customer?.first_name} {transaction.customer?.last_name} • {transaction.currency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(transaction.amount / 100, 'ZAR')}
                              </p>
                              <Badge className={
                                transaction.status === "success" 
                                  ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                                  : transaction.status === "failed"
                                  ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                              }>
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No transactions found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Activity tracking coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
