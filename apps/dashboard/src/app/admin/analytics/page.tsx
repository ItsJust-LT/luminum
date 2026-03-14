"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Eye,
  Users,
  FileText,
  Mail,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Globe,
  Building2,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import {
  getAdminAnalyticsOverview,
  getAdminAnalyticsTimeseries,
  getAdminAnalyticsBreakdown,
  getAdminAnalyticsTopPages,
  getAdminAnalyticsCountries,
  getAdminAnalyticsDevices,
} from "@/lib/actions/admin-actions"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

type DateRange = "7d" | "30d" | "90d"

function getDateRange(range: DateRange): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  if (range === "7d") start.setDate(start.getDate() - 7)
  else if (range === "30d") start.setDate(start.getDate() - 30)
  else start.setDate(start.getDate() - 90)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30d")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<any>(null)
  const [timeseries, setTimeseries] = useState<any[]>([])
  const [breakdown, setBreakdown] = useState<any[]>([])
  const [breakdownBy, setBreakdownBy] = useState<"organization" | "website">("organization")
  const [topPages, setTopPages] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const { start, end } = getDateRange(range)
    const granularity = range === "7d" ? "hour" : "day"

    try {
      const [overviewRes, timeseriesRes, breakdownRes, topPagesRes, countriesRes, devicesRes] = await Promise.all([
        getAdminAnalyticsOverview(start, end),
        getAdminAnalyticsTimeseries(start, end, granularity),
        getAdminAnalyticsBreakdown(start, end, breakdownBy),
        getAdminAnalyticsTopPages(start, end, 10),
        getAdminAnalyticsCountries(start, end, 10),
        getAdminAnalyticsDevices(start, end, 5),
      ])

      if (overviewRes.success) setOverview(overviewRes.overview)
      if (timeseriesRes.success) setTimeseries(timeseriesRes.data || [])
      if (breakdownRes.success) setBreakdown(breakdownRes.breakdown || [])
      if (topPagesRes.success) setTopPages(topPagesRes.data || [])
      if (countriesRes.success) setCountries(countriesRes.data || [])
      if (devicesRes.success) setDevices(devicesRes.data || [])
    } catch (err: any) {
      setError(err.message || "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [range, breakdownBy])

  const chartData = useMemo(() => {
    return timeseries.map((item: any) => ({
      ...item,
      label: new Date(item.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }))
  }, [timeseries])

  const deviceIcons: Record<string, any> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet }

  const overviewCards = [
    { title: "Page Views", value: overview?.pageViews ?? 0, icon: Eye, color: "from-blue-500 to-blue-600" },
    { title: "Unique Sessions", value: overview?.uniqueSessions ?? 0, icon: Users, color: "from-green-500 to-green-600" },
    { title: "Form Submissions", value: overview?.formSubmissions ?? 0, icon: FileText, color: "from-orange-500 to-orange-600" },
    { title: "Emails", value: overview?.emails ?? 0, icon: Mail, color: "from-purple-500 to-purple-600" },
  ]

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-platform metrics across all organizations and websites
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              {loading ? (
                <>
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(card.value)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.title}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeseries Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Traffic Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                  />
                  <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="hsl(220, 90%, 56%)" fill="hsl(220, 90%, 56%)" fillOpacity={0.1} strokeWidth={2} />
                  <Area type="monotone" dataKey="uniqueSessions" name="Sessions" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} strokeWidth={2} />
                  <Area type="monotone" dataKey="formSubmissions" name="Forms" stroke="hsl(24, 94%, 50%)" fill="hsl(24, 94%, 50%)" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No data for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown + Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Breakdown by Org/Website */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {breakdownBy === "organization" ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-muted-foreground" />}
                Traffic Breakdown
              </CardTitle>
              <Select value={breakdownBy} onValueChange={(v) => setBreakdownBy(v as any)}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">By Organization</SelectItem>
                  <SelectItem value="website">By Website</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : breakdown.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{breakdownBy === "organization" ? "Organization" : "Website"}</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Forms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((row: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium truncate max-w-[200px]">
                        {breakdownBy === "organization" ? row.name : (
                          <div>
                            <span>{row.name || row.domain}</span>
                            {row.orgName && <span className="text-xs text-muted-foreground ml-1">({row.orgName})</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(row.pageViews)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.uniqueSessions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.formSubmissions)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : topPages.length > 0 ? (
              <div className="space-y-2">
                {topPages.map((page: any, i: number) => {
                  const maxCount = topPages[0]?.count || 1
                  const width = Math.max((page.count / maxCount) * 100, 8)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="relative h-8 rounded-md overflow-hidden bg-muted/30">
                          <div className="absolute inset-y-0 left-0 bg-blue-500/10 rounded-md" style={{ width: `${width}%` }} />
                          <span className="absolute inset-0 flex items-center px-3 text-xs font-medium truncate">{page.key}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-12 text-right flex-shrink-0">{formatNumber(page.count)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Countries + Devices */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : countries.length > 0 ? (
              <div className="space-y-2">
                {countries.map((country: any, i: number) => {
                  const maxCount = countries[0]?.count || 1
                  const width = Math.max((country.count / maxCount) * 100, 8)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="relative h-8 rounded-md overflow-hidden bg-muted/30">
                          <div className="absolute inset-y-0 left-0 bg-green-500/10 rounded-md" style={{ width: `${width}%` }} />
                          <span className="absolute inset-0 flex items-center px-3 text-xs font-medium truncate">{country.key}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-12 text-right flex-shrink-0">{formatNumber(country.count)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((device: any, i: number) => {
                  const total = devices.reduce((sum: number, d: any) => sum + d.count, 0)
                  const pct = total > 0 ? Math.round((device.count / total) * 100) : 0
                  const DeviceIcon = deviceIcons[device.key.toLowerCase()] || Monitor
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                      <DeviceIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{device.key}</span>
                          <span className="text-sm font-medium">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatNumber(device.count)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
