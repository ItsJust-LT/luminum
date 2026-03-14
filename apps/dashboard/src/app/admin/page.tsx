"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Building2,
  Users,
  Globe,
  TrendingUp,
  FileText,
  Mail,
  HelpCircle,
  Eye,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CreditCard,
} from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"
import { getAdminDashboardStats } from "@/lib/actions/admin-actions"

interface DashboardStats {
  totalOrgs: number
  totalUsers: number
  totalWebsites: number
  totalSubscriptions: number
  totalEmails: number
  totalFormSubmissions: number
  newUsersThisMonth: number
  newOrgsThisMonth: number
  bannedUsers: number
  openTickets: number
  totalPageViews: number
  unseenForms: number
  recentUsers: Array<{ id: string; name: string; email: string; image?: string; createdAt: string; role?: string }>
  recentOrgs: Array<{ id: string; name: string; slug: string; logo?: string; createdAt: string; _count: { members: number } }>
}

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAdminDashboardStats()
      if (result.success && result.stats) {
        setStats(result.stats)
      } else {
        setError(result.error || "Failed to load stats")
      }
    } catch (err: any) {
      setError(err.message || "Failed to load stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers ?? 0, change: stats?.newUsersThisMonth ?? 0, changeLabel: "this month", icon: Users, href: "/admin/users", color: "from-blue-500 to-blue-600" },
    { title: "Organizations", value: stats?.totalOrgs ?? 0, change: stats?.newOrgsThisMonth ?? 0, changeLabel: "this month", icon: Building2, href: "/admin/organizations", color: "from-purple-500 to-purple-600" },
    { title: "Active Subscriptions", value: stats?.totalSubscriptions ?? 0, icon: CreditCard, href: "/admin/organizations", color: "from-green-500 to-green-600" },
    { title: "Page Views (30d)", value: stats?.totalPageViews ?? 0, icon: Eye, href: "/admin/analytics", color: "from-orange-500 to-orange-600" },
    { title: "Form Submissions", value: stats?.totalFormSubmissions ?? 0, unseen: stats?.unseenForms ?? 0, icon: FileText, href: "/admin/forms", color: "from-pink-500 to-pink-600" },
    { title: "Emails", value: stats?.totalEmails ?? 0, icon: Mail, href: "/admin/emails", color: "from-cyan-500 to-cyan-600" },
    { title: "Websites", value: stats?.totalWebsites ?? 0, icon: Globe, href: "/admin/websites", color: "from-indigo-500 to-indigo-600" },
    { title: "Open Tickets", value: stats?.openTickets ?? 0, icon: HelpCircle, href: "/admin/support", color: "from-red-500 to-red-600" },
  ]

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide metrics and recent activity
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2 self-start">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-all duration-200 hover:border-border/60 cursor-pointer h-full">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                    <card.icon className="h-4 w-4 text-white" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                {loading ? (
                  <>
                    <Skeleton className="h-7 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(card.value)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.title}</p>
                    {card.change !== undefined && card.change > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">+{card.change} {card.changeLabel}</span>
                      </div>
                    )}
                    {"unseen" in card && (card as any).unseen > 0 && (
                      <Badge variant="secondary" className="mt-1.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                        {(card as any).unseen} unseen
                      </Badge>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Recent Users
              </CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : stats?.recentUsers?.length ? (
              stats.recentUsers.map((user) => (
                <Link key={user.id} href={`/admin/users/${user.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {user.role === "admin" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(user.createdAt, { relative: true })}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Organizations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Recent Organizations
              </CardTitle>
              <Link href="/admin/organizations">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : stats?.recentOrgs?.length ? (
              stats.recentOrgs.map((org) => (
                <Link key={org.id} href={`/${org.slug}/dashboard`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={org.logo || ""} />
                    <AvatarFallback className="rounded-lg text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
                      {org.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org._count?.members || 0} members</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(org.createdAt, { relative: true })}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No organizations yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/admin/organizations">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <span className="text-xs font-medium">Organizations</span>
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium">Users</span>
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <span className="text-xs font-medium">Analytics</span>
              </Button>
            </Link>
            <Link href="/admin/support">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <HelpCircle className="h-5 w-5 text-red-600" />
                <span className="text-xs font-medium">Support</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
