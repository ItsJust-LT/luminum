'use client'
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Pie, PieChart, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  Users,
  TrendingUp,
  Activity,
  FileText,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
  BarChart3,
  ExternalLink,
  AlertTriangle,
  Tablet,
  Laptop,
  ArrowRight,
  LogIn,
  LogOut,
  Route,
  Network,
  Layers,
  ChevronRight,
} from "lucide-react"
import type {
  MetricCount,
  StatsOverview,
  PageFlowResponse,
  EntryExitResponse,
  SessionPathsResponse,
  PageStatsResponse,
  ReferrerSourceRow,
} from "@/lib/types/analytics"
import { api } from "@/lib/api"
import { formatDuration, cn } from "@/lib/utils"
import { cleanAnalyticsPath } from "@/lib/analytics/clean-route"
import { getCountryFlag } from "@/components/analytics/analytics-country-flags"
import {
  ANALYTICS_DATE_RANGES,
  getAnalyticsPresetBounds,
  type AnalyticsDateRangeValue,
  type AnalyticsPresetRange,
} from "@/components/analytics/analytics-date-ranges"
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/date-range-picker"
import { AnalyticsKpiGrid } from "@/components/analytics/analytics-kpi-grid"
import { AnalyticsSetupBanner } from "@/components/analytics/analytics-setup-banner"
import { useOrganization } from "@/lib/contexts/organization-context"
import type { Website } from "@/lib/types/websites"
import { useRouter } from "next/navigation"
import { PageDataSpinner } from "@/components/shell/page-data-spinner"
import { useAnalyticsPresence } from "@/lib/ably/client"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { LiveVisitorsBadges } from "@/components/analytics/live-visitors-counter"
import { AnalyticsReferrersSection } from "@/components/analytics/analytics-referrers-section"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import {
  formatChartAxisTick,
  formatChartTooltipTime,
  granularityForAnalytics,
  timeseriesGranularityForAnalytics,
} from "@/lib/analytics/chart-time-format"
import { Separator } from "@/components/ui/separator"
import { min } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type OverviewData = StatsOverview

interface LiveData {
  activeVisitors: number
  recentEvents: Array<{
    timestamp: string
    url: string
    pageTitle?: string
    country: string
    deviceType: string
  }>
}

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

export default function AnalyticsPage() {
  const router = useRouter()
  const { organization, userRole, loading: orgLoading, error: orgError } = useOrganization()
  
  // Core state
  const [dateRange, setDateRange] = useState<AnalyticsDateRangeValue>("7d")
  const [customRange, setCustomRange] = useState<DateRangeValue | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [website, setWebsite] = useState<Website | null>(null)
  const [websiteLoading, setWebsiteLoading] = useState(true)
  
  
  // Analytics data state
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([])
  const [topPages, setTopPages] = useState<MetricCount[]>([])
  const [topCountries, setTopCountries] = useState<MetricCount[]>([])
  const [deviceData, setDeviceData] = useState<MetricCount[]>([])
  const [referrerRows, setReferrerRows] = useState<ReferrerSourceRow[]>([])
  const [liveData, setLiveData] = useState<LiveData>({ activeVisitors: 0, recentEvents: [] })

  // Advanced analytics state
  const [pageFlow, setPageFlow] = useState<PageFlowResponse | null>(null)
  const [entryExit, setEntryExit] = useState<EntryExitResponse | null>(null)
  const [sessionPaths, setSessionPaths] = useState<SessionPathsResponse | null>(null)
  const [pageStats, setPageStats] = useState<PageStatsResponse | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [analyticsSetupStatus, setAnalyticsSetupStatus] = useState<{
    access: boolean
    websites: Array<{ id: string; domain: string; name?: string; analytics: boolean; scriptVerified: boolean; scriptLastVerifiedAt?: string; scriptError?: string }>
  } | null>(null)
  const [analyticsAccessChecked, setAnalyticsAccessChecked] = useState(false)
  const [analyticsAccess, setAnalyticsAccess] = useState<boolean | null>(null)
  const [verifyingScript, setVerifyingScript] = useState(false)

  const fetchAnalyticsDataRef = useRef<() => void>(() => {})
  const { liveCount: presenceLiveCount, livePages: presenceLivePages, connected: presenceConnected } = useAnalyticsPresence(website?.id ?? null)
  const liveViewersCount = presenceConnected ? presenceLiveCount : liveData.activeVisitors
  const liveConnected = presenceConnected

  const sortedLivePages = useMemo(() => {
    return Object.entries(presenceLivePages)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
  }, [presenceLivePages])

  // Real-time: auto-refresh analytics when new events are inserted (database-driven)
  const { onMessage } = useRealtime()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsub = onMessage("analytics:event", (data: any) => {
      if (!website) return
      const wid = website.id
      if (data?.websiteId !== wid) return

      // Debounce: batch rapid events into a single refresh (2s delay)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        fetchAnalyticsDataRef.current?.()
      }, 2000)
    })
    return () => {
      unsub()
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [onMessage, website])

  // Route guard: fetch analytics access from API (source of truth) so direct URL access is blocked when disabled
  useEffect(() => {
    if (!organization?.id) return
    setAnalyticsAccessChecked(false)
    api.organizationSettings.getAnalyticsEnabled(organization.id)
      .then((r: any) => {
        setAnalyticsAccess(!!r?.enabled)
        setAnalyticsAccessChecked(true)
      })
      .catch(() => {
        setAnalyticsAccess(false)
        setAnalyticsAccessChecked(true)
      })
  }, [organization?.id])

  // Fetch website data when organization is available and access is granted
  useEffect(() => {
    if (organization && analyticsAccess) {
      fetchWebsite()
    }
  }, [organization?.id, analyticsAccess])

  useEffect(() => {
    if (!organization?.id || !analyticsAccess) return
    api.analytics.getSetupStatus(organization.id).then((r: any) => {
      if (r?.success) setAnalyticsSetupStatus({ access: r.access, websites: r.websites || [] })
    }).catch(() => {})
  }, [organization?.id, analyticsAccess])

  const fetchWebsite = async () => {
    if (!organization) return
    
    try {
      setWebsiteLoading(true)
      const res = await api.websites.list(organization.id) as { data?: any[] }
      const websites = res?.data
      if (websites && websites.length > 0) {
        setWebsite(websites[0])
      }
    } catch (error) {
      console.error("Error fetching website:", error)
    } finally {
      setWebsiteLoading(false)
    }
  }

  const getDateRange = useCallback((range: AnalyticsDateRangeValue, custom: DateRangeValue | null) => {
    const now = new Date()

    if (range === "custom" && custom?.from && custom?.to) {
      const start = new Date(custom.from)
      start.setHours(0, 0, 0, 0)
      const endDay = new Date(custom.to)
      endDay.setHours(23, 59, 59, 999)
      const end = min([endDay, now])
      if (end.getTime() < start.getTime()) {
        return { start: start.toISOString(), end: now.toISOString() }
      }
      return { start: start.toISOString(), end: end.toISOString() }
    }

    // Custom without a complete range, or unknown key: use rolling 7 days (avoids empty/invalid API bounds).
    if (range === "custom") {
      const { start, end } = getAnalyticsPresetBounds("7d")
      return { start: start.toISOString(), end: end.toISOString() }
    }

    const { start, end } = getAnalyticsPresetBounds(range)
    return { start: start.toISOString(), end: end.toISOString() }
  }, [])

  // Fetch analytics data via server actions
  const fetchAnalyticsData = useCallback(async () => {
    if (!website) return

    try {
      const { start, end } = getDateRange(dateRange, customRange)
      const tsGranularity = timeseriesGranularityForAnalytics(
        dateRange,
        customRange?.from,
        customRange?.to
      )

      const [overview, timeseries, pages, countries, devices, referrers, realtime, flow, entryExitData, paths, stats] =
        await Promise.all([
        api.analytics.getOverview(website.id, start, end).catch(() => null),
        api.analytics.getTimeSeries(website.id, start, end, tsGranularity).catch(() => null),
        api.analytics.getTopPages(website.id, start, end, 10).catch(() => []),
        api.analytics.getCountries(website.id, start, end, 10).catch(() => []),
        api.analytics.getDevices(website.id, start, end, 5).catch(() => []),
        api.analytics.getReferrers(website.id, start, end, 12).catch(() => null),
        api.analytics.getRealtime(website.id).catch(() => null),
        api.analytics.getPageFlow(website.id, start, end, 50).catch(() => null),
        api.analytics.getEntryExit(website.id, start, end, 10).catch(() => null),
        api.analytics.getSessionPaths(website.id, start, end, 20).catch(() => null),
        api.analytics.getPageStats(website.id, start, end, 20).catch(() => null),
      ])

      if (overview) setOverviewData(overview as OverviewData)
      setTimeSeriesData(Array.isArray((timeseries as { data?: unknown[] })?.data) ? (timeseries as { data: unknown[] }).data : [])
      setTopPages((pages ?? []) as MetricCount[])
      setTopCountries((countries ?? []) as MetricCount[])
      setDeviceData((devices ?? []) as MetricCount[])
      const refPayload = referrers as { referrers?: ReferrerSourceRow[] } | null
      setReferrerRows(Array.isArray(refPayload?.referrers) ? refPayload.referrers : [])
      setLiveData({
        activeVisitors: (realtime as { activeVisitors?: number })?.activeVisitors ?? 0,
        recentEvents: ((realtime as { recentEvents?: LiveData["recentEvents"] })?.recentEvents ?? []) as LiveData["recentEvents"],
      })
      setPageFlow(flow as PageFlowResponse | null)
      setEntryExit(entryExitData as EntryExitResponse | null)
      setSessionPaths(paths as SessionPathsResponse | null)
      setPageStats(stats as PageStatsResponse | null)
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [website, dateRange, customRange, getDateRange])

  fetchAnalyticsDataRef.current = fetchAnalyticsData

  // Poll realtime every 30s for live count
  useEffect(() => {
    if (!website) return
    const t = setInterval(() => {
      api.analytics.getRealtime(website.id).then((r: unknown) => {
        if (!r) return
        const data = r as { activeVisitors?: number; recentEvents?: LiveData["recentEvents"] }
        setLiveData((prev) => ({ ...prev, activeVisitors: data.activeVisitors ?? 0, recentEvents: (data.recentEvents ?? prev.recentEvents) as LiveData["recentEvents"] }))
      })
    }, 30000)
    return () => clearInterval(t)
  }, [website])

  // Fetch data when component mounts or date range changes
  useEffect(() => {
    if (website) {
      fetchAnalyticsData()
    }
  }, [fetchAnalyticsData])

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
  }

  // Enhanced chart configurations with better colors
  const chartTimeGranularity = useMemo(
    () => granularityForAnalytics(dateRange, customRange?.from, customRange?.to),
    [dateRange, customRange]
  )

  /** Calendar control: presets show their rolling window; custom uses chosen inclusive days. */
  const datePickerValue = useMemo((): DateRangeValue => {
    if (dateRange === "custom" && customRange?.from && customRange?.to) {
      return { from: customRange.from, to: customRange.to }
    }
    const preset: AnalyticsPresetRange = dateRange === "custom" ? "7d" : dateRange
    const { start, end } = getAnalyticsPresetBounds(preset)
    return { from: start, to: end }
  }, [dateRange, customRange])

  const chartConfig: ChartConfig = {
    pageViews: {
      label: "Page views",
      color: "var(--color-chart-1)",
    },
    uniqueSessions: {
      label: "Sessions",
      color: "var(--color-chart-2)",
    },
  }

  const deviceChartConfig: ChartConfig = {
    visitors: {
      label: "Visitors",
    },
    mobile: {
      label: "Mobile",
      color: "var(--color-chart-1)",
    },
    desktop: {
      label: "Desktop",
      color: "var(--color-chart-2)",
    },
    tablet: {
      label: "Tablet",
      color: "var(--color-chart-3)",
    },
  }

  // Helper function to get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      case 'desktop':
        return <Monitor className="h-4 w-4" />
      default:
        return <Laptop className="h-4 w-4" />
    }
  }

  // Helper function to determine if we should show live activity
  const shouldShowLiveActivity = () => {
    return liveViewersCount > 0 || liveData.recentEvents.length > 0
  }

  // Loading states
  if (orgLoading || websiteLoading) {
    return (
      <AppPageContainer fullWidth>
        <div className="app-hero relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 sm:p-8 md:p-12">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Analytics Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed">
              Comprehensive insights and real-time analytics
            </p>
          </div>
        </div>
        <PageDataSpinner label="Loading organization…" />
      </AppPageContainer>
    )
  }

  // Error states
  if (orgError || !organization) {
    return (
      <AppPageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="app-card w-full max-w-md border-destructive/20">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">{orgError || "Organization not found"}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/dashboard")} className="w-full app-touch">
                Back to Organizations
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </AppPageContainer>
    )
  }

  // Route guard: analytics feature not enabled (API-checked so direct URL access is blocked)
  if (analyticsAccessChecked && analyticsAccess === false) {
    return (
      <AppPageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="app-card w-full max-w-md">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Analytics not enabled</h3>
              <p className="text-muted-foreground mb-4">
                Analytics is not enabled for this organization. Contact an administrator to enable analytics tracking.
              </p>
              <Button onClick={() => router.push(`/${organization.slug}/dashboard`)} variant="outline" className="w-full app-touch">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppPageContainer>
    )
  }

  // Wait for access check before showing any analytics UI
  if (!analyticsAccessChecked || analyticsAccess !== true) {
    return (
      <AppPageContainer fullWidth>
        <div className="app-hero relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 sm:p-8 md:p-12">
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Analytics Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed">
              Checking access…
            </p>
          </div>
        </div>
        <PageDataSpinner label="Checking analytics access…" />
      </AppPageContainer>
    )
  }

  if (!website) {
    return (
      <AppPageContainer fullWidth>
        <div className="app-hero relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 sm:p-8 md:p-12">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Analytics Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed">
              Comprehensive insights and real-time analytics for {organization.name}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16 sm:py-24">
          <Card className="app-card w-full max-w-md">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 text-center">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Website Found</h3>
              <p className="text-muted-foreground mb-4">
                This organization doesn't have a website yet. Create one to start tracking analytics.
              </p>
              <Button onClick={() => router.push(`/${organization.slug}/website`)} className="app-touch">
                Create Website
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppPageContainer>
    )
  }

  const websiteName = website.name || organization.name
  const websiteUrl = website.domain ? `https://${website.domain}` : undefined

  const handleVerifyScriptNow = async () => {
    if (!organization?.id || verifyingScript) return
    setVerifyingScript(true)
    try {
      const res = (await api.analytics.verifyScriptNow(organization.id)) as {
        success?: boolean
        checked?: number
        failed?: number
      }
      if (res?.success) {
        const next = (await api.analytics.getSetupStatus(organization.id)) as {
          success?: boolean
          access?: boolean
          websites?: NonNullable<typeof analyticsSetupStatus>["websites"]
        }
        if (next?.success && next.websites)
          setAnalyticsSetupStatus({ access: next.access ?? false, websites: next.websites })
      }
    } catch {
      /* keep status */
    } finally {
      setVerifyingScript(false)
    }
  }

  return (
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed sm:text-base">
                  How people find and use <span className="text-foreground font-medium">{websiteName}</span>
                </p>
              </div>
            </div>
            {websiteUrl ? (
              <Button variant="link" size="sm" className="text-muted-foreground h-auto px-0" asChild>
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{websiteUrl.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                </a>
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-border/60 lg:border-0 lg:pt-0 pt-2 lg:justify-end">
            <LiveVisitorsBadges liveCount={liveViewersCount} connected={liveConnected} />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="text-muted-foreground shrink-0 text-sm font-medium">Date range</span>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="bg-muted flex flex-wrap gap-1 rounded-lg p-1">
                {ANALYTICS_DATE_RANGES.map((r) => (
                  <Button
                    key={r.value}
                    type="button"
                    variant={dateRange === r.value ? "default" : "ghost"}
                    size="sm"
                    title={r.label}
                    className={dateRange === r.value ? "shadow-sm" : "hover:bg-background/80"}
                    onClick={() => {
                      setDateRange(r.value)
                      setCustomRange(null)
                    }}
                  >
                    {r.shortLabel}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={dateRange === "custom" ? "default" : "ghost"}
                  size="sm"
                  className={dateRange === "custom" ? "shadow-sm" : "hover:bg-background/80"}
                  onClick={() => {
                    setDateRange("custom")
                    setCustomRange((prev) => {
                      if (prev?.from && prev?.to) return prev
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - 7)
                      return { from: start, to: end }
                    })
                  }}
                >
                  Custom
                </Button>
              </div>
              <DateRangePicker
                value={datePickerValue}
                onChange={(v) => {
                  if (!v) {
                    setDateRange("7d")
                    setCustomRange(null)
                    return
                  }
                  setDateRange("custom")
                  setCustomRange(v)
                }}
                placeholder="Select date range"
                className="w-full min-w-0 sm:w-auto sm:min-w-[260px]"
                numberOfMonths={2}
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {analyticsSetupStatus?.websites?.length ? (
        <AnalyticsSetupBanner
          websites={analyticsSetupStatus.websites}
          verifying={verifyingScript}
          onRecheck={handleVerifyScriptNow}
        />
      ) : null}

      {overviewData ? (
        <AnalyticsKpiGrid
          overview={overviewData}
          liveCount={liveViewersCount}
          liveConnected={liveConnected}
        />
      ) : null}

      {/* Traffic full width, then top pages */}
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Card className="app-card border-border/50 shadow-sm">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Traffic Over Time
            </CardTitle>
            <CardDescription>Website traffic trends for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {timeSeriesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                    <XAxis
                      dataKey="time"
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                      tickFormatter={(value) => formatChartAxisTick(value, chartTimeGranularity)}
                    />
                    <YAxis
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      domain={[0, "dataMax"]}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => formatChartTooltipTime(label, chartTimeGranularity)}
                        />
                      }
                    />
                    <defs>
                      <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="uniqueSessions"
                      type="monotone"
                      fill="url(#fillSessions)"
                      fillOpacity={0.6}
                      stroke="var(--color-chart-2)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{
                        r: 6,
                        stroke: "var(--color-chart-2)",
                        strokeWidth: 2,
                        fill: "var(--background)",
                      }}
                    />
                    <Area
                      dataKey="pageViews"
                      type="monotone"
                      fill="url(#fillPageViews)"
                      fillOpacity={0.6}
                      stroke="var(--color-chart-1)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{
                        r: 6,
                        stroke: "var(--color-chart-1)",
                        strokeWidth: 2,
                        fill: "var(--background)",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No traffic data available</p>
                  <p className="text-sm">Data will appear once visitors start using your site</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AnalyticsReferrersSection rows={referrerRows} />

        <Card className="app-card border-border/50 shadow-sm">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              Top Pages
            </CardTitle>
            <CardDescription>Most visited pages on your website</CardDescription>
          </CardHeader>
          <CardContent>
            {topPages.length > 0 ? (
              <div className="space-y-4">
                {topPages.slice(0, 6).map((page, index) => {
                  const totalViews = topPages.reduce((sum, p) => sum + (p.count || 0), 0)
                  const percentage = totalViews > 0 ? ((page.count || 0) / totalViews) * 100 : 0
                  
                  const cleanRoute = cleanAnalyticsPath(page.key)

                  return (
                    <div
                      key={page.key}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] border border-transparent hover:border-primary/10"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-primary/80 to-primary text-white text-sm font-bold shadow-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {page.title ? (
                            <div className="font-medium text-foreground truncate">{page.title}</div>
                          ) : null}
                          <div
                            className={cn(
                              "truncate font-mono text-muted-foreground",
                              page.title ? "text-xs" : "font-medium text-foreground"
                            )}
                          >
                            {cleanRoute}
                          </div>
                          <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}% of traffic</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="font-medium bg-primary/10 text-primary border-primary/20">
                          {(page.count || 0).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
                {topPages.length > 6 && (
                  <div className="text-center text-sm text-muted-foreground pt-2">
                    Showing top 6 of {topPages.length} pages
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No page data available</p>
                <p className="text-sm">Data will appear once visitors start browsing your site</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device & Geographic Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Device Analytics */}
        <Card className="app-card border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              Device Analytics
            </CardTitle>
            <CardDescription>Visitor device breakdown and usage patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {deviceData.length > 0 ? (
              <>
                <ChartContainer
                  config={deviceChartConfig}
                  className="mx-auto aspect-square max-h-[300px] mb-6"
                >
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={deviceData.map((device, index) => ({
                        device: device.key,
                        visitors: device.count || 0,
                        fill: CHART_COLORS[index % CHART_COLORS.length],
                      }))}
                      dataKey="visitors"
                      nameKey="device"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="40%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {deviceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          style={{
                            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
                          }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-3">
                  {deviceData.map((device, index) => {
                    const totalDevices = deviceData.reduce((sum, d) => sum + (d.count || 0), 0)
                    const percentage = totalDevices > 0 ? ((device.count || 0) / totalDevices) * 100 : 0

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/10"
                        style={{ borderLeftColor: CHART_COLORS[index % CHART_COLORS.length], borderLeftWidth: '3px' }}
                      >
                        <div className="bg-muted p-2 rounded-lg">
                          {getDeviceIcon(device.key)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold capitalize text-sm">{device.key}</div>
                          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                        <Badge variant="secondary" className="text-xs font-semibold border">
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

        {/* Geographic Distribution */}
        <Card className="app-card border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              Geographic Distribution
            </CardTitle>
            <CardDescription>Top visitor locations and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            {topCountries.length > 0 ? (
              <div className="space-y-4">
                {topCountries.slice(0, 8).map((country, index) => {
                  const totalCountries = topCountries.reduce((sum, c) => sum + (c.count || 0), 0)
                  const percentage = totalCountries > 0 ? ((country.count || 0) / totalCountries) * 100 : 0
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] border border-transparent hover:border-primary/10"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="text-primary-foreground bg-primary w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                        >
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getCountryFlag(country.key)}</span>
                          <div>
                            <span className="font-semibold text-foreground">{country.key}</span>
                            <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}% of traffic</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
                            style={{ 
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                        <Badge variant="secondary" className="font-semibold px-3 py-1 border">
                          {(country.count || 0).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
                {topCountries.length > 8 && (
                  <div className="text-center text-sm text-muted-foreground pt-2">
                    Showing top 8 of {topCountries.length} countries
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No geographic data available</p>
                <p className="text-sm">Data will appear once visitors from different locations visit your site</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Per-Page Visitors */}
      {sortedLivePages.length > 0 && (
        <Card className="app-card border-0 bg-gradient-to-br from-cyan-50/30 to-blue-50/30 dark:from-cyan-950/30 dark:to-blue-950/30 shadow-lg ring-1 ring-cyan-200/50 dark:ring-cyan-800/50">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-xl">
                <Layers className="h-5 w-5 text-cyan-600" />
              </div>
              Live Visitors by Page
              <Badge variant="secondary" className="ml-auto bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse mr-2" />
                {liveViewersCount} online
              </Badge>
            </CardTitle>
            <CardDescription>Real-time breakdown of which pages visitors are currently viewing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedLivePages.slice(0, 15).map((item, index) => {
                const maxCount = sortedLivePages[0]?.count || 1
                const percentage = (item.count / maxCount) * 100
                const cleanRoute = cleanAnalyticsPath(item.page)

                return (
                  <div key={index} className="group flex items-center gap-4 p-3 rounded-xl bg-background/60 hover:bg-background/80 transition-all duration-200 border border-cyan-200/20 dark:border-cyan-800/20">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium truncate text-foreground">{cleanRoute}</div>
                        <div className="w-full mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-700"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800 font-bold tabular-nums">
                      {item.count} {item.count === 1 ? 'visitor' : 'visitors'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Page Analytics Tabs */}
      <Card className="app-card border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Network className="h-5 w-5 text-primary" />
            </div>
            Page Intelligence
          </CardTitle>
          <CardDescription>Deep insights into visitor navigation patterns and page performance</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <ScrollArea className="w-full">
              <TabsList className="bg-muted/50 inline-flex h-auto w-max min-w-full gap-1 p-1 sm:w-full sm:grid sm:grid-cols-4">
                <TabsTrigger value="overview" className="shrink-0 px-3 text-xs sm:text-sm">
                  Page Stats
                </TabsTrigger>
                <TabsTrigger value="flow" className="shrink-0 px-3 text-xs sm:text-sm">
                  Page Flow
                </TabsTrigger>
                <TabsTrigger value="entry-exit" className="shrink-0 px-3 text-xs sm:text-sm">
                  Entry & Exit
                </TabsTrigger>
                <TabsTrigger value="paths" className="shrink-0 px-3 text-xs sm:text-sm">
                  User Journeys
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

            {/* Page Stats Tab */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              {pageStats && pageStats.pages.length > 0 ? (
                <>
                  <div className="md:hidden space-y-3">
                    {pageStats.pages.map((page, index) => {
                      const cleanRoute = cleanAnalyticsPath(page.page)
                      const maxViews = pageStats.pages[0]?.views || 1
                      const barWidth = (page.views / maxViews) * 100
                      return (
                        <Card key={index} className="overflow-hidden">
                          <CardContent className="relative p-4">
                            <div
                              className="bg-primary/5 pointer-events-none absolute inset-y-0 left-0"
                              style={{ width: `${barWidth}%` }}
                            />
                            <div className="relative space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0">
                                    {page.title ? (
                                      <div className="text-sm font-medium text-foreground">{page.title}</div>
                                    ) : null}
                                    <span className="break-all font-mono text-sm text-muted-foreground">{cleanRoute}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div>
                                  <span className="text-xs uppercase tracking-wide">Views</span>
                                  <div className="text-foreground font-semibold">
                                    {page.views.toLocaleString()}{" "}
                                    <span className="text-muted-foreground font-normal">
                                      ({page.sharePercent}%)
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs uppercase tracking-wide">Visitors</span>
                                  <div className="text-foreground font-medium">
                                    {page.uniqueVisitors.toLocaleString()}
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-xs uppercase tracking-wide">Avg. time</span>
                                  <div>
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {formatDuration(page.avgDuration)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  <div className="hidden md:block">
                    <ScrollArea className="max-h-[min(28rem,60vh)] w-full rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[45%]">Page / URL</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Visitors</TableHead>
                            <TableHead className="text-right">Avg. time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageStats.pages.map((page, index) => {
                            const cleanRoute = cleanAnalyticsPath(page.page)
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                      {page.title ? (
                                        <div className="truncate text-sm font-medium">{page.title}</div>
                                      ) : null}
                                      <div className="truncate font-mono text-xs text-muted-foreground">{cleanRoute}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums">
                                  {page.views.toLocaleString()}
                                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                                    ({page.sharePercent}%)
                                  </span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {page.uniqueVisitors.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {formatDuration(page.avgDuration)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                  <div className="text-muted-foreground flex flex-col gap-1 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span>Total: {pageStats.totalViews.toLocaleString()} views</span>
                    <span>{pageStats.pages.length} pages tracked</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No page data available yet</p>
                  <p className="text-sm mt-1">Page statistics will appear as visitors browse your site</p>
                </div>
              )}
            </TabsContent>

            {/* Page Flow Tab */}
            <TabsContent value="flow" className="space-y-6 mt-0">
              {pageFlow && pageFlow.links.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/50 dark:to-violet-900/30 text-center">
                      <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">{pageFlow.totalTransitions.toLocaleString()}</div>
                      <div className="text-xs font-medium text-violet-600 dark:text-violet-400 mt-1">Total Transitions</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{pageFlow.uniqueSessions.toLocaleString()}</div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">Sessions</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 text-center">
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{pageFlow.nodes.length}</div>
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">Unique Pages</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 text-center">
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pageFlow.links.length}</div>
                      <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">Flow Paths</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Page Transitions</h4>
                    <div className="space-y-2">
                      {pageFlow.links.slice(0, 15).map((link, index) => {
                        const fromClean = cleanAnalyticsPath(link.source)
                        const toClean = cleanAnalyticsPath(link.target)
                        const maxVal = pageFlow.links[0]?.value || 1
                        const width = (link.value / maxVal) * 100

                        return (
                          <div key={index} className="relative group rounded-xl overflow-hidden">
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent transition-all duration-700"
                              style={{ width: `${width}%` }}
                            />
                            <div className="relative flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold shrink-0">
                                {index + 1}
                              </span>
                              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                <span className="font-mono text-sm truncate max-w-[40%]">{fromClean}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="font-mono text-sm truncate max-w-[40%]">{toClean}</span>
                              </div>
                              <Badge variant="secondary" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800 shrink-0">
                                {link.value.toLocaleString()}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {pageFlow.nodes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pages by Session Volume</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {pageFlow.nodes
                          .sort((a, b) => b.sessions - a.sessions)
                          .slice(0, 12)
                          .map((node, index) => {
                            const cleanRoute = cleanAnalyticsPath(node.id)
                            return (
                              <div key={index} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/10 text-center">
                                <div className="font-mono text-xs truncate mb-1">{cleanRoute}</div>
                                <div className="text-lg font-bold text-primary">{node.sessions}</div>
                                <div className="text-xs text-muted-foreground">sessions</div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No page flow data available yet</p>
                  <p className="text-sm mt-1">Page transition tracking will populate as visitors navigate between pages</p>
                </div>
              )}
            </TabsContent>

            {/* Entry & Exit Pages Tab */}
            <TabsContent value="entry-exit" className="space-y-6 mt-0">
              {entryExit && (entryExit.topEntryPages.length > 0 || entryExit.topExitPages.length > 0) ? (
                <>
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <span className="text-2xl font-bold">{entryExit.totalSessions.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground ml-2">total sessions analyzed</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Entry Pages */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <LogIn className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm font-semibold uppercase tracking-wider">Top Entry Pages</h4>
                        <Badge variant="secondary" className="ml-auto text-xs">Where visitors land</Badge>
                      </div>
                      <div className="space-y-2">
                        {entryExit.topEntryPages.map((item, index) => {
                          const cleanRoute = cleanAnalyticsPath(item.page)
                          const maxCount = entryExit.topEntryPages[0]?.count || 1
                          const barWidth = (item.count / maxCount) * 100
                          const pct = entryExit.totalSessions > 0 ? ((item.count / entryExit.totalSessions) * 100).toFixed(1) : '0'

                          return (
                            <div key={index} className="relative rounded-lg overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 to-transparent" style={{ width: `${barWidth}%` }} />
                              <div className="relative flex items-center justify-between p-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">{index + 1}</span>
                                  <div className="min-w-0">
                                    {item.title ? (
                                      <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
                                    ) : null}
                                    <div className="truncate font-mono text-xs text-muted-foreground">{cleanRoute}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-muted-foreground">{pct}%</span>
                                  <Badge variant="secondary" className="text-xs tabular-nums">{item.count.toLocaleString()}</Badge>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Exit Pages */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <LogOut className="h-4 w-4 text-red-500" />
                        <h4 className="text-sm font-semibold uppercase tracking-wider">Top Exit Pages</h4>
                        <Badge variant="secondary" className="ml-auto text-xs">Where visitors leave</Badge>
                      </div>
                      <div className="space-y-2">
                        {entryExit.topExitPages.map((item, index) => {
                          const cleanRoute = cleanAnalyticsPath(item.page)
                          const maxCount = entryExit.topExitPages[0]?.count || 1
                          const barWidth = (item.count / maxCount) * 100
                          const pct = entryExit.totalSessions > 0 ? ((item.count / entryExit.totalSessions) * 100).toFixed(1) : '0'

                          return (
                            <div key={index} className="relative rounded-lg overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-red-500/8 to-transparent" style={{ width: `${barWidth}%` }} />
                              <div className="relative flex items-center justify-between p-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xs font-bold shrink-0">{index + 1}</span>
                                  <div className="min-w-0">
                                    {item.title ? (
                                      <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
                                    ) : null}
                                    <div className="truncate font-mono text-xs text-muted-foreground">{cleanRoute}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-muted-foreground">{pct}%</span>
                                  <Badge variant="secondary" className="text-xs tabular-nums">{item.count.toLocaleString()}</Badge>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <LogIn className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No entry/exit data available yet</p>
                  <p className="text-sm mt-1">Data will appear once enough sessions are recorded</p>
                </div>
              )}
            </TabsContent>

            {/* User Journeys Tab */}
            <TabsContent value="paths" className="space-y-6 mt-0">
              {sessionPaths && sessionPaths.paths.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 text-center">
                      <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{sessionPaths.totalSessions.toLocaleString()}</div>
                      <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">Total Sessions</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/50 dark:to-teal-900/30 text-center">
                      <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{sessionPaths.avgPagesPerSession}</div>
                      <div className="text-xs font-medium text-teal-600 dark:text-teal-400 mt-1">Avg. Pages/Session</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 text-center col-span-2 sm:col-span-1">
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{sessionPaths.paths.length}</div>
                      <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-1">Unique Journeys</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Most Common Visitor Journeys</h4>
                    <div className="space-y-3">
                      {sessionPaths.paths.map((journey, index) => {
                        const cleanPages = journey.pages.map((p) => cleanAnalyticsPath(p))

                        return (
                          <div key={index} className="p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors border border-transparent hover:border-primary/10">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Route className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold">Journey #{index + 1}</span>
                                <Badge variant="outline" className="text-xs">{journey.depth} pages</Badge>
                              </div>
                              <Badge className="bg-primary/10 text-primary border-primary/20 tabular-nums">
                                {journey.count} {journey.count === 1 ? 'session' : 'sessions'}
                              </Badge>
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5">
                              {cleanPages.map((page, pageIndex) => (
                                <React.Fragment key={pageIndex}>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-background border text-xs font-mono truncate max-w-[180px]">
                                    {page}
                                  </span>
                                  {pageIndex < cleanPages.length - 1 && (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No journey data available yet</p>
                  <p className="text-sm mt-1">User journeys will appear as visitors navigate multiple pages</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Real-time Activity Section */}
       {shouldShowLiveActivity() && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
          <Card className="app-card border-0 bg-gradient-to-br from-green-50/30 to-emerald-50/30 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg ring-1 ring-green-200/50 dark:ring-green-800/50">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-xl">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                Live Activity Feed
                <Badge variant="secondary" className="ml-auto bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  Real-time
                </Badge>
              </CardTitle>
              <CardDescription>Recent visitor actions and page views</CardDescription>
            </CardHeader>
            <CardContent>
              {liveData.recentEvents.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {liveData.recentEvents.slice(0, 10).map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-lg bg-background/60 hover:bg-background/80 transition-all duration-200 border border-green-200/30 dark:border-green-800/30 hover:border-green-300/50 dark:hover:border-green-700/50"
                    >
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-green-700 dark:text-green-400">Page view</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground font-medium">{event.country}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <div className="flex items-center gap-1">
                            {getDeviceIcon(event.deviceType)}
                            <span className="text-xs text-muted-foreground capitalize">{event.deviceType}</span>
                          </div>
                        </div>
                        {event.pageTitle ? (
                          <div className="text-sm font-medium text-foreground truncate">{event.pageTitle}</div>
                        ) : null}
                        <div className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                          {event.url}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded">
                        {new Date(event.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-lg font-medium text-green-700 dark:text-green-400">
                      {liveViewersCount} visitors online now
                    </span>
                  </div>
                  <p className="text-sm">Recent activity will appear here as visitors browse your site</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppPageContainer>
  )
}