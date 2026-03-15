"use client"

import { useSession } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Building2, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar, 
  Activity, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react"
import { AdminOrganizationCreatorDialog } from "@/components/dashboard/admin-organization-creator-dialog"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient, 
  loading 
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: any
  gradient: string
  loading?: boolean
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className={cn(
      "border-0 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl",
      `bg-gradient-to-br ${gradient}`
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground/90">{title}</CardTitle>
        <div className={cn(
          "p-2 rounded-lg shadow-sm",
          gradient.includes("green") ? "bg-green-100/50 dark:bg-green-900/30" :
          gradient.includes("blue") ? "bg-blue-100/50 dark:bg-blue-900/30" :
          gradient.includes("purple") ? "bg-purple-100/50 dark:bg-purple-900/30" :
          gradient.includes("orange") ? "bg-orange-100/50 dark:bg-orange-900/30" :
          "bg-muted/50"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            gradient.includes("green") ? "text-green-700 dark:text-green-300" :
            gradient.includes("blue") ? "text-blue-700 dark:text-blue-300" :
            gradient.includes("purple") ? "text-purple-700 dark:text-purple-300" :
            gradient.includes("orange") ? "text-orange-700 dark:text-orange-300" :
            "text-muted-foreground"
          )} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground mb-1">
              {value}
            </div>
            {subtitle && (
              <p className="text-sm text-foreground/70 font-medium">
                {subtitle}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  </motion.div>
)

export function AdminDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    
    try {
      const result = await api.admin.getDashboardStats() as { success?: boolean; stats?: any; data?: any; error?: string }
      const data = result?.stats ?? result?.data
      if (result?.success && data) {
        setStats(data)
        setOrganizations(data.recent?.organizations ?? data.recentOrgs ?? [])
      } else {
        setError(result.error || "Failed to fetch dashboard data")
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError("Failed to fetch dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOrganizationCreated = () => {
    fetchData(true)
  }

  const formatDate = (value?: string) => {
    if (!value) return "—"
    const d = new Date(value)
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const getSubscriptionStatus = (org: any) => {
    const status = org.subscriptionStatus || "active"
    switch (status) {
      case 'active':
        return { status: 'Active', color: 'bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/20' }
      case 'trialing':
        return { status: 'Trial', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20' }
      case 'past_due':
        return { status: 'Past Due', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 border-yellow-500/20' }
      case 'canceled':
        return { status: 'Canceled', color: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' }
      default:
        return { status: status || 'Unknown', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20' }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1.5">
              Monitor system performance, manage organizations, and track growth
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", (refreshing || loading) && "animate-spin")} />
              Refresh
            </Button>
            <AdminOrganizationCreatorDialog onOrganizationCreated={handleOrganizationCreated} />
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Error Loading Data</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={loading ? "—" : formatCurrency(stats?.organizations.totalRevenue || 0, 'ZAR')}
            subtitle={loading ? "" : `+${formatCurrency(stats?.organizations.monthlyRevenue || 0, 'ZAR')} this month`}
            icon={DollarSign}
            gradient="from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
            loading={loading}
          />
          <StatCard
            title="Organizations"
            value={loading ? "—" : stats?.organizations.total || 0}
            subtitle={loading ? "" : `${stats?.organizations.active || 0} active • ${stats?.organizations.withSubscriptions || 0} with subscriptions`}
            icon={Building2}
            gradient="from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
            loading={loading}
          />
          <StatCard
            title="Total Users"
            value={loading ? "—" : stats?.users.total || 0}
            subtitle={loading ? "" : `${stats?.users.active || 0} active • +${stats?.users.newThisMonth || 0} new this month`}
            icon={Users}
            gradient="from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20"
            loading={loading}
          />
          <StatCard
            title="Growth Rate"
            value={loading ? "—" : `${stats?.growth.orgGrowthRate || 0}%`}
            subtitle={loading ? "" : "Organization growth"}
            icon={TrendingUp}
            gradient="from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20"
            loading={loading}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-foreground">
                    {stats?.subscriptions.active || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats?.subscriptions.total || 0} total • {stats?.subscriptions.trialing || 0} trialing
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                User Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-foreground">
                    {stats?.users.owners || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Owners • {stats?.users.members || 0} members
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-foreground">
                    {stats?.growth.revenueGrowthRate || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Month over month
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Organizations */}
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Recent Organizations
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Latest organizations added to the platform
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-full max-w-sm">
                  <Input
                    placeholder="Search organizations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/organizations")}
                  className="gap-2"
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : organizations.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
                <p className="text-muted-foreground mb-4">No organizations have been created yet.</p>
                <AdminOrganizationCreatorDialog onOrganizationCreated={handleOrganizationCreated} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {organizations
                  .filter((org) => {
                    const q = search.trim().toLowerCase()
                    if (!q) return true
                    return (
                      org.name?.toLowerCase().includes(q) ||
                      org.slug?.toLowerCase().includes(q)
                    )
                  })
                  .map((org: any, index: number) => {
                    const subscriptionInfo = getSubscriptionStatus(org)
                    return (
                      <motion.div
                        key={org.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className="group border hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card/80 backdrop-blur-sm cursor-pointer"
                              onClick={() => router.push(`/${org.slug}/dashboard`)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                                  <AvatarImage src={org.logo || ""} />
                                  <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-bold">
                                    {org.name?.[0]?.toUpperCase() || "O"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold truncate text-foreground">{org.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">@{org.slug}</div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge className={cn("text-xs border", subscriptionInfo.color)}>
                                {subscriptionInfo.status}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {org.memberCount || 0}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
