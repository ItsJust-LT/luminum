"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pie, PieChart } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  MousePointer,
  BarChart3,
  RefreshCw,
  FileText,
  Globe,
  Smartphone,
  Monitor,
} from "lucide-react"
import { AnalyticsChart } from "./analytics-chart"
import { TopPagesTable } from "./top-pages-table"
import { FormSubmissionsInfo } from "./form-submissions-info"
import type { MetricCount } from "@/lib/actions/analytics"
import {
  getAnalyticsOverview,
  getAnalyticsTimeSeries,
  getAnalyticsTopPages,
  getAnalyticsCountries,
  getAnalyticsDevices,
  getAnalyticsRealtime,
} from "@/lib/actions/analytics"
import { formatDuration } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useOrganizationChannel, useAnalyticsPresence } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { useOrganization } from "@/lib/contexts/organization-context"
import { LiveVisitorsBadges, LiveViewersMetricCard } from "@/components/analytics/live-visitors-counter"

interface AnalyticsDashboardProps {
  websiteId: string
  analyticsEnabled: boolean
}

interface OverviewData {
  pageViews: number
  uniqueVisitors: number
  avgSessionDuration: number
  bounceRate: number
  newVisitors: number
}

export function AnalyticsDashboard({ websiteId, analyticsEnabled }: AnalyticsDashboardProps) {
  const { organization } = useOrganization()
  const [data, setData] = useState<OverviewData | null>(null)
  const [timeseriesData, setTimeseriesData] = useState<any[]>([])
  const [topPages, setTopPages] = useState<MetricCount[]>([])
  const [apiLiveViewers, setApiLiveViewers] = useState(0)
  const [formSubmissions, setFormSubmissions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState("7d")
  const [deviceData, setDeviceData] = useState<MetricCount[]>([])
  const [countryData, setCountryData] = useState<MetricCount[]>([])
  const fetchRef = useRef<() => void>(() => {})

  const fetchAnalyticsData = useCallback(async () => {
    if (!analyticsEnabled) return

    try {
      const endDate = new Date()
      const startDate = new Date()
      switch (dateRange) {
        case "24h":
          startDate.setHours(endDate.getHours() - 24)
          break
        case "7d":
          startDate.setDate(endDate.getDate() - 7)
          break
        case "30d":
          startDate.setDate(endDate.getDate() - 30)
          break
        case "90d":
          startDate.setDate(endDate.getDate() - 90)
          break
      }
      const start = startDate.toISOString()
      const end = endDate.toISOString()

      const [overview, timeseries, pages, realtimeData, devices, countries] = await Promise.all([
        getAnalyticsOverview(websiteId, start, end),
        getAnalyticsTimeSeries(websiteId, start, end, dateRange === "24h" ? "hour" : "day"),
        getAnalyticsTopPages(websiteId, start, end, 10),
        getAnalyticsRealtime(websiteId),
        getAnalyticsDevices(websiteId, start, end, 5),
        getAnalyticsCountries(websiteId, start, end, 10),
      ])

      if (overview) {
        setData({
          pageViews: overview.pageViews || 0,
          uniqueVisitors: overview.uniqueSessions || 0,
          avgSessionDuration: overview.avgDuration || 0,
          bounceRate: 0,
          newVisitors: Math.round((overview.uniqueSessions || 0) * 0.7),
        })
        setFormSubmissions(overview.formSubmissions || 0)
      }
      setTimeseriesData(timeseries?.data ?? [])
      setTopPages(pages ?? [])
      setApiLiveViewers(realtimeData?.activeVisitors ?? 0)
      setDeviceData(devices ?? [])
      setCountryData(countries ?? [])
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [websiteId, analyticsEnabled, dateRange])

  fetchRef.current = fetchAnalyticsData

  const { connected: ablyConnected } = useOrganizationChannel(
    analyticsEnabled && organization ? organization.id : null,
    useCallback((eventType: string) => {
      if (eventType === OrganizationEvents.FORM_SUBMISSION_CREATED || eventType === OrganizationEvents.FORM_SUBMISSION_UPDATED) {
        fetchRef.current?.()
      }
    }, [])
  )
  const { liveCount: presenceLiveCount, connected: presenceConnected } = useAnalyticsPresence(
    analyticsEnabled ? websiteId : null
  )
  const liveViewers = presenceConnected ? presenceLiveCount : apiLiveViewers
  const liveConnected = presenceConnected

  useEffect(() => {
    if (!analyticsEnabled) {
      setLoading(false)
      return
    }
    fetchAnalyticsData()
  }, [fetchAnalyticsData, analyticsEnabled])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
  }

  if (!analyticsEnabled) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
          <CardDescription>Comprehensive website analytics and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5 rounded-2xl" />
              <div className="relative">
                <BarChart3 className="h-20 w-20 text-muted-foreground/40 mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-3 text-foreground">Analytics Disabled</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                  Analytics tracking is currently disabled for this website. Enable comprehensive tracking to unlock
                  powerful insights.
                </p>
                <Button variant="outline" className="bg-background/50 backdrop-blur-sm">
                  Contact Administrator
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-1 p-1 bg-muted rounded-lg">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-8 w-12 rounded" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/50 dark:to-slate-900/30">
              <CardContent className="p-6 text-center">
                <Skeleton className="h-14 w-14 rounded-xl mx-auto mb-4" />
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart skeleton */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Bottom row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Time Range:</span>
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  {[
                    { value: "24h", label: "24h" },
                    { value: "7d", label: "7d" },
                    { value: "30d", label: "30d" },
                    { value: "90d", label: "90d" },
                  ].map((range) => (
                    <Button
                      key={range.value}
                      variant={dateRange === range.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDateRange(range.value)}
                      className={dateRange === range.value ? "shadow-sm" : "hover:bg-background/50"}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
              
            </div>
            <div className="flex items-center gap-3">
              <LiveVisitorsBadges liveCount={liveViewers} connected={liveConnected} />
              {formSubmissions > 0 && (
                <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
                  <FileText className="h-3 w-3" />
                  {formSubmissions} submissions
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-background/50 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/50 dark:to-slate-900/30">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-slate-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Eye className="h-8 w-8 text-slate-600 dark:text-slate-400" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100 cursor-help">
                    {(data.pageViews || 0).toLocaleString()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total number of pages viewed by all visitors</p>
                </TooltipContent>
              </Tooltip>
              <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">Page Views</div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/20">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-3xl font-bold mb-2 text-emerald-900 dark:text-emerald-100 cursor-help">
                    {(data.uniqueVisitors || 0).toLocaleString()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Number of unique visitors to your website</p>
                </TooltipContent>
              </Tooltip>
              <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Unique Sessions</div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 dark:from-indigo-950/30 dark:to-indigo-900/20">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-indigo-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-3xl font-bold mb-2 text-indigo-900 dark:text-indigo-100 cursor-help">
                    {formatDuration(data.avgSessionDuration || 0)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Average time visitors spend on your website per session</p>
                </TooltipContent>
              </Tooltip>
              <div className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Avg. Session</div>
            </CardContent>
          </Card>

          <LiveViewersMetricCard liveCount={liveViewers} connected={liveConnected} />


          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-cyan-50/50 to-cyan-100/30 dark:from-cyan-950/30 dark:to-cyan-900/20">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-cyan-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-3xl font-bold mb-2 text-cyan-900 dark:text-cyan-100">{formSubmissions}</div>
              <div className="text-sm text-cyan-700 dark:text-cyan-300 font-medium">Form Submissions</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnalyticsChart
          data={timeseriesData}
          title="Traffic Over Time"
          description={`Website traffic for the last ${dateRange}`}
        />
        <TopPagesTable pages={topPages} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="flex flex-col border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg">
          <CardHeader className="items-center pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              Device Analytics
            </CardTitle>
            <CardDescription>Visitor device breakdown and usage patterns</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-6">
            {deviceData.length > 0 ? (
              <>
                <ChartContainer
                  config={
                    {
                      visitors: {
                        label: "Visitors",
                      },
                      mobile: {
                        label: "Mobile",
                        color: "var(--chart-1)",
                      },
                      desktop: {
                        label: "Desktop",
                        color: "var(--chart-2)",
                      },
                      tablet: {
                        label: "Tablet",
                        color: "var(--chart-3)",
                      },
                      other: {
                        label: "Other",
                        color: "var(--chart-4)",
                      },
                    } satisfies ChartConfig
                  }
                  className="mx-auto aspect-square max-h-[280px]"
                >
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={deviceData.map((device) => ({
                        device: device.key,
                        visitors: device.count || 0,
                        fill: `var(--color-${device.key})`,
                      }))}
                      dataKey="visitors"
                      nameKey="device"
                    />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {deviceData.map((device, index) => {
                    const totalDevices = deviceData.reduce((sum, d) => sum + (d.count || 0), 0)
                    const percentage = totalDevices > 0 ? ((device.count || 0) / totalDevices) * 100 : 0

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:scale-105"
                      >
                        {device.key === "mobile" ? (
                          <Smartphone className="h-5 w-5 text-[var(--chart-1)]" />
                        ) : device.key === "desktop" ? (
                          <Monitor className="h-5 w-5 text-[var(--chart-2)]" />
                        ) : (
                          <Monitor className="h-5 w-5 text-[var(--chart-3)]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold capitalize text-sm">{device.key}</div>
                          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                        <Badge variant="secondary" className="text-xs font-semibold px-2 py-1">
                          {(device.count || 0).toLocaleString()}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No device data available</p>
                <p className="text-sm">Data will appear once visitors start using your site</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              Geographic Distribution
            </CardTitle>
            <CardDescription>Top visitor locations and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {countryData.slice(0, 8).map((country, index) => {
                const totalCountries = countryData.reduce((sum, c) => sum + (c.count || 0), 0)
                const percentage = totalCountries > 0 ? ((country.count || 0) / totalCountries) * 100 : 0

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        {index + 1}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{country.key}</span>
                        <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}% of traffic</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-slate-500 to-slate-600 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="font-semibold px-3 py-1">
                        {(country.count || 0).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Submissions Section */}
      <FormSubmissionsInfo websiteId={websiteId} />
    </div>
  )
}