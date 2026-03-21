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
  Gauge,
  Activity,
  AlertTriangle,
  Lightbulb,
} from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"
import { api } from "@/lib/api"
import { Progress } from "@/components/ui/progress"

interface AuditAdminStats {
  totalAudits: number
  auditsCreatedLast30Days: number
  auditsByStatus: Record<string, number>
  completedAuditsLast30Days: number
  avgPerformanceScoreLast30Days: number | null
  gradeDistributionLast30Days: Record<"A" | "B" | "C" | "D" | "F", number>
  websitesWithAtLeastOneCompletedAudit: number
  websiteAuditCoveragePercent: number | null
  poorPerformingCountLast30Days: number
  topBottlenecksLast30Days: Array<{ title: string; count: number }>
  recentAudits: Array<{
    id: string
    status: string
    targetUrl: string
    formFactor: string
    completedAt: string | null
    createdAt: string
    performanceScore: number | null
    grade: string | null
    domain: string
    organizationName: string
    organizationSlug: string
  }>
  lowestRecentScores: Array<{
    auditId: string
    performanceScore: number
    grade: string | null
    domain: string
    organizationSlug: string
    completedAt: string
  }>
}

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
  auditStats?: AuditAdminStats
}

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.admin.getDashboardStats() as { success?: boolean; stats?: DashboardStats; error?: string }
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

      {/* Site performance audits (platform-wide) */}
      {!loading && stats?.auditStats && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Gauge className="h-5 w-5 text-indigo-600" />
                Site performance audits
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Lighthouse-based scans across all organizations (last 30 days highlighted)
              </p>
            </div>
            <Link href="/admin/websites">
              <Button variant="outline" size="sm" className="gap-1 shrink-0">
                Websites <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground font-medium">Total scans</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(stats.auditStats.totalAudits)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  +{formatNumber(stats.auditStats.auditsCreatedLast30Days)} in 30d
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground font-medium">Avg performance (30d)</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.auditStats.avgPerformanceScoreLast30Days != null
                    ? stats.auditStats.avgPerformanceScoreLast30Days
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.auditStats.completedAuditsLast30Days} completed runs
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground font-medium">Website coverage</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.auditStats.websiteAuditCoveragePercent != null
                    ? `${stats.auditStats.websiteAuditCoveragePercent}%`
                    : "—"}
                </p>
                <Progress
                  value={stats.auditStats.websiteAuditCoveragePercent ?? 0}
                  className="h-1.5 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.auditStats.websitesWithAtLeastOneCompletedAudit} / {stats.totalWebsites} sites with a completed audit
                </p>
              </CardContent>
            </Card>
            <Card className={stats.auditStats.poorPerformingCountLast30Days > 0 ? "border-orange-200 dark:border-orange-900/50" : ""}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  Needs attention (30d)
                </p>
                <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                  {formatNumber(stats.auditStats.poorPerformingCountLast30Days)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Completed scans with score under 50</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Queue health
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(["queued", "running", "completed", "failed"] as const).map((key) => {
                  const n = stats.auditStats!.auditsByStatus[key] ?? 0
                  const variant =
                    key === "failed" ? "destructive" : key === "running" || key === "queued" ? "secondary" : "outline"
                  return (
                    <Badge key={key} variant={variant} className="capitalize text-xs">
                      {key}: {n}
                    </Badge>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Grade mix (30d)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(["A", "B", "C", "D", "F"] as const).map((g) => {
                  const count = stats.auditStats!.gradeDistributionLast30Days[g] ?? 0
                  const total = stats.auditStats!.completedAuditsLast30Days || 1
                  const pct = Math.round((count / total) * 100)
                  const barColor =
                    g === "A" ? "bg-emerald-500"
                      : g === "B" ? "bg-green-500"
                        : g === "C" ? "bg-yellow-500"
                          : g === "D" ? "bg-orange-500"
                            : "bg-red-500"
                  return (
                    <div key={g} className="flex items-center gap-2 text-xs">
                      <span className="w-4 font-mono font-semibold">{g}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-muted-foreground w-16 text-right">{count} ({pct}%)</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Common bottlenecks (30d)</CardTitle>
                <p className="text-xs text-muted-foreground font-normal">Aggregated from completed scan summaries</p>
              </CardHeader>
              <CardContent>
                {stats.auditStats.topBottlenecksLast30Days.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bottleneck data yet — run more audits.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.auditStats.topBottlenecksLast30Days.map((b) => (
                      <li key={b.title} className="flex justify-between gap-2 text-sm">
                        <span className="truncate" title={b.title}>{b.title}</span>
                        <Badge variant="secondary" className="shrink-0">{b.count}×</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Lowest scores (30d)</CardTitle>
                <p className="text-xs text-muted-foreground font-normal">Opens org Site Audits in a new context</p>
              </CardHeader>
              <CardContent>
                {stats.auditStats.lowestRecentScores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed audits in the last 30 days.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.auditStats.lowestRecentScores.map((row) => (
                      <li key={row.auditId}>
                        <Link
                          href={`/${row.organizationSlug}/audits`}
                          className="flex items-center justify-between gap-2 text-sm rounded-md p-2 -mx-2 hover:bg-muted/60 transition-colors"
                        >
                          <span className="truncate">
                            <span className="font-medium">{row.domain}</span>
                            <span className="text-muted-foreground"> · {row.organizationSlug}</span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="font-mono">{row.performanceScore}</Badge>
                            {row.grade && <Badge variant="secondary">{row.grade}</Badge>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent scans</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {stats.auditStats.recentAudits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audits recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium">Site</th>
                      <th className="pb-2 pr-3 font-medium">Org</th>
                      <th className="pb-2 pr-3 font-medium">Score</th>
                      <th className="pb-2 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.auditStats.recentAudits.map((a) => (
                      <tr key={a.id} className="border-b border-border/40 last:border-0">
                        <td className="py-2 pr-3">
                          <Badge variant={a.status === "failed" ? "destructive" : a.status === "completed" ? "outline" : "secondary"} className="text-[10px] capitalize">
                            {a.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 truncate max-w-[140px]" title={a.targetUrl}>{a.domain}</td>
                        <td className="py-2 pr-3">
                          <Link href={`/${a.organizationSlug}/audits`} className="text-primary hover:underline truncate block max-w-[120px]">
                            {a.organizationName}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 font-mono">
                          {a.performanceScore != null ? a.performanceScore : "—"}
                          {a.grade && <span className="text-muted-foreground ml-1">({a.grade})</span>}
                        </td>
                        <td className="py-2 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(a.createdAt, { relative: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Suggested product &amp; system improvements
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                High-impact next steps for the audit platform (not live metrics)
              </p>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                <li><span className="text-foreground font-medium">SEO &amp; content checks</span> — title/meta/H1/alt text and keyword hints; fold into a weighted overall score with performance.</li>
                <li><span className="text-foreground font-medium">Scheduling &amp; alerts</span> — daily/weekly scans via cron; notify orgs when scores drop beyond a threshold.</li>
                <li><span className="text-foreground font-medium">Exports &amp; sharing</span> — JSON download, PDF summary, and expiring share links for read-only results.</li>
                <li><span className="text-foreground font-medium">Deeper performance UI</span> — waterfall chart from stored network requests; optional Lighthouse accessibility category.</li>
                <li><span className="text-foreground font-medium">Operational hardening</span> — Redis cache for &ldquo;latest audit per website&rdquo;; dedupe jobs for same URL+form factor while queued; worker health metric in admin monitoring.</li>
                <li><span className="text-foreground font-medium">RUM vs lab</span> — compare synthetic Lighthouse scores to real-user metrics from your analytics pipeline where available.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

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
