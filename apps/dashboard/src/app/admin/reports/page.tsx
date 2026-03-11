"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2,
  DollarSign,
  RefreshCw,
  Crown,
  AlertCircle
} from "lucide-react"
import { useState, useEffect } from "react"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { getOrganizationsAsAdmin } from "@/lib/actions/admin-organization-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizations: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    newUsersThisMonth: 0,
    newOrganizationsThisMonth: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getOrganizationsAsAdmin()
      if (result.success && result.data) {
        const orgs = result.data
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // Calculate real statistics
        const totalOrgs = orgs.length
        const newOrgsThisMonth = orgs.filter((org: any) => 
          new Date(org.createdAt) >= thisMonth
        ).length
        
        // Calculate user statistics
        const allUsers = new Set()
        const newUsersThisMonth = new Set()
        
        orgs.forEach((org: any) => {
          if (org.members) {
            org.members.forEach((member: any) => {
              if (member.user) {
                allUsers.add(member.user.id)
                
                // Check if user was created this month
                const userCreatedAt = new Date(member.createdAt)
                if (userCreatedAt >= thisMonth) {
                  newUsersThisMonth.add(member.user.id)
                }
              }
            })
          }
        })
        
        // Calculate revenue
        let totalRevenue = 0
        let monthlyRevenue = 0
        let activeSubscriptions = 0
        
        orgs.forEach((org: any) => {
          if (org.subscriptions) {
            org.subscriptions.forEach((sub: any) => {
              if (sub.amount && sub.status === 'active') {
                totalRevenue += sub.amount
                activeSubscriptions++
                
                // Check if subscription was created this month
                const subDate = new Date(sub.created_at)
                if (subDate >= thisMonth) {
                  monthlyRevenue += sub.amount
                }
              }
            })
          }
        })
        
        setStats({
          totalUsers: allUsers.size,
          totalOrganizations: totalOrgs,
          totalRevenue,
          monthlyRevenue,
          activeSubscriptions,
          newUsersThisMonth: newUsersThisMonth.size,
          newOrganizationsThisMonth: newOrgsThisMonth
        })
      } else {
        setError(result.error || "Failed to fetch data")
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      setError("Failed to fetch statistics")
    } finally {
      setLoading(false)
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
              <BarChart3 className="h-7 w-7 text-primary" />
              Admin Reports
            </h1>
            <p className="text-muted-foreground mt-1.5">
              View real-time system statistics and analytics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats} 
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <h3 className="font-semibold text-destructive">Error Loading Data</h3>
                    <p className="text-sm text-destructive/80">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* System Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</p>
                  )}
                  {loading ? (
                    <Skeleton className="h-3 w-24 mt-2" />
                  ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">+{stats.newUsersThisMonth} this month</span>
                  </div>
                  )}
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organizations</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatNumber(stats.totalOrganizations)}</p>
                  )}
                  {loading ? (
                    <Skeleton className="h-3 w-24 mt-2" />
                  ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">+{stats.newOrganizationsThisMonth} this month</span>
                  </div>
                  )}
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue, 'ZAR')}</p>
                  )}
                  {loading ? (
                    <Skeleton className="h-3 w-32 mt-2" />
                  ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">+{formatCurrency(stats.monthlyRevenue, 'ZAR')} this month</span>
                  </div>
                  )}
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatNumber(stats.activeSubscriptions)}</p>
                  )}
                  {loading ? (
                    <Skeleton className="h-3 w-20 mt-2" />
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Currently active
                    </p>
                  )}
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </div>

        {/* Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>
              Real-time data from your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Data Sources</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• User data from Better Auth user management</li>
                  <li>• Organization data from database</li>
                  <li>• Revenue data from active subscriptions</li>
                  <li>• Growth metrics calculated from creation dates</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">Note</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  This dashboard shows real data from your system. All metrics are calculated from actual user registrations, 
                  organization creations, and subscription data. No mock data is used.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  )
}
