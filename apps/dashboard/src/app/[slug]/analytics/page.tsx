'use client'
import React, { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Pie, PieChart, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  Activity,
  FileText,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
  Calendar,
  BarChart3,
  ExternalLink,
  AlertTriangle,
  Tablet,
  Laptop,
} from "lucide-react"
import type { MetricCount, StatsOverview } from "@/lib/actions/analytics"
import {
  getAnalyticsOverview,
  getAnalyticsTimeSeries,
  getAnalyticsTopPages,
  getAnalyticsCountries,
  getAnalyticsDevices,
  getAnalyticsRealtime,
} from "@/lib/actions/analytics"
import { formatDuration } from "@/lib/utils"
import { FormSubmissionsInfo } from "@/components/analytics/form-submissions-info"
import { useOrganization } from "@/lib/contexts/organization-context"
import { getWebsitesByOrganization } from "@/lib/supabase/websites"
import type { Website } from "@/lib/types/websites"
import { useRouter } from "next/navigation"
import { AnalyticsSkeleton } from "@/components/ui/skeleton-loader"
import { useOrganizationChannel, useAnalyticsPresence } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { LiveVisitorsBadges, LiveViewersMetricCard } from "@/components/analytics/live-visitors-counter"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

type OverviewData = StatsOverview

interface LiveData {
  activeVisitors: number
  recentEvents: Array<{
    timestamp: string
    url: string
    country: string
    deviceType: string
  }>
}

// Date range options
const DATE_RANGES = [
  { value: "24h", label: "Last 24 Hours", hours: 24 },
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
]

// Enhanced color palette for charts
const CHART_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#ec4899', // Pink
  '#6366f1', // Indigo
]

// Country code to emoji mapping
const getCountryFlag = (countryName: string): string => {
  const countryFlags: { [key: string]: string } = {
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'United Kingdom': '🇬🇧',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Australia': '🇦🇺',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Argentina': '🇦🇷',
    'South Korea': '🇰🇷',
    'Russia': '🇷🇺',
    'Turkey': '🇹🇷',
    'Saudi Arabia': '🇸🇦',
    'South Africa': '🇿🇦',
    'Nigeria': '🇳🇬',
    'Egypt': '🇪🇬',
    'Morocco': '🇲🇦',
    'Kenya': '🇰🇪',
    'Ghana': '🇬🇭',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Singapore': '🇸🇬',
    'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩',
    'Sri Lanka': '🇱🇰',
    'UAE': '🇦🇪',
    'Israel': '🇮🇱',
    'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿',
    'Hungary': '🇭🇺',
    'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'Croatia': '🇭🇷',
    'Serbia': '🇷🇸',
    'Ukraine': '🇺🇦',
    'Belarus': '🇧🇾',
    'Lithuania': '🇱🇹',
    'Latvia': '🇱🇻',
    'Estonia': '🇪🇪',
    'Finland': '🇫🇮',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Iceland': '🇮🇸',
    'Ireland': '🇮🇪',
    'Portugal': '🇵🇹',
    'Switzerland': '🇨🇭',
    'Austria': '🇦🇹',
    'Belgium': '🇧🇪',
    'Luxembourg': '🇱🇺',
    'Greece': '🇬🇷',
    'Cyprus': '🇨🇾',
    'Malta': '🇲🇹',
    'New Zealand': '🇳🇿',
    'Chile': '🇨🇱',
    'Peru': '🇵🇪',
    'Colombia': '🇨🇴',
    'Venezuela': '🇻🇪',
    'Ecuador': '🇪🇨',
    'Bolivia': '🇧🇴',
    'Paraguay': '🇵🇾',
    'Uruguay': '🇺🇾',
    'Costa Rica': '🇨🇷',
    'Panama': '🇵🇦',
    'Guatemala': '🇬🇹',
    'Honduras': '🇭🇳',
    'El Salvador': '🇸🇻',
    'Nicaragua': '🇳🇮',
    'Belize': '🇧🇿',
    'Jamaica': '🇯🇲',
    'Cuba': '🇨🇺',
    'Dominican Republic': '🇩🇴',
    'Haiti': '🇭🇹',
    'Puerto Rico': '🇵🇷',
    'Trinidad and Tobago': '🇹🇹',
    'Barbados': '🇧🇧',
    'Bahamas': '🇧🇸'
  }
  return countryFlags[countryName] || '🌍'
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { organization, userRole, loading: orgLoading, error: orgError } = useOrganization()
  
  // Core state
  const [dateRange, setDateRange] = useState("7d")
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
  const [liveData, setLiveData] = useState<LiveData>({ activeVisitors: 0, recentEvents: [] })

  // Realtime: refetch when form created/updated (Ably organization channel)
  const fetchAnalyticsDataRef = useRef<() => void>(() => {})
  const onOrgEvent = useCallback((eventType: string) => {
    if (eventType === OrganizationEvents.FORM_SUBMISSION_CREATED || eventType === OrganizationEvents.FORM_SUBMISSION_UPDATED) {
      fetchAnalyticsDataRef.current?.()
    }
  }, [])
  const { connected: ablyConnected } = useOrganizationChannel(organization?.id ?? null, onOrgEvent)
  const { liveCount: presenceLiveCount, connected: presenceConnected } = useAnalyticsPresence(website?.id ?? null)
  const liveViewersCount = presenceConnected ? presenceLiveCount : liveData.activeVisitors
  const liveConnected = presenceConnected

  // Fetch website data when organization is available
  useEffect(() => {
    if (organization) {
      fetchWebsite()
    }
  }, [organization?.id])

  const fetchWebsite = async () => {
    if (!organization) return
    
    try {
      setWebsiteLoading(true)
      const { data: websites } = await getWebsitesByOrganization(organization.id)
      if (websites && websites.length > 0) {
        setWebsite(websites[0])
      }
    } catch (error) {
      console.error("Error fetching website:", error)
    } finally {
      setWebsiteLoading(false)
    }
  }

  // Calculate date range
  const getDateRange = useCallback((range: string) => {
    const end = new Date()
    const start = new Date()

    const selectedRange = DATE_RANGES.find(r => r.value === range)
    if (!selectedRange) return { start: start.toISOString(), end: end.toISOString() }

    if (selectedRange.hours) {
      start.setHours(end.getHours() - selectedRange.hours)
    } else if (selectedRange.days) {
      start.setDate(end.getDate() - selectedRange.days)
    }

    return { start: start.toISOString(), end: end.toISOString() }
  }, [])

  // Fetch analytics data via server actions
  const fetchAnalyticsData = useCallback(async () => {
    if (!website) return

    try {
      const { start, end } = getDateRange(dateRange)

      const [overview, timeseries, pages, countries, devices, realtime] = await Promise.all([
        getAnalyticsOverview(website.id, start, end),
        getAnalyticsTimeSeries(website.id, start, end, dateRange === "24h" ? "hour" : "day"),
        getAnalyticsTopPages(website.id, start, end, 10),
        getAnalyticsCountries(website.id, start, end, 10),
        getAnalyticsDevices(website.id, start, end, 5),
        getAnalyticsRealtime(website.id),
      ])

      if (overview) setOverviewData(overview)
      setTimeSeriesData(timeseries?.data ?? [])
      setTopPages(pages ?? [])
      setTopCountries(countries ?? [])
      setDeviceData(devices ?? [])
      setLiveData({
        activeVisitors: realtime?.activeVisitors ?? 0,
        recentEvents: realtime?.recentEvents ?? [],
      })
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [website, dateRange, getDateRange])

  fetchAnalyticsDataRef.current = fetchAnalyticsData

  // Poll realtime every 30s for live count
  useEffect(() => {
    if (!website) return
    const t = setInterval(() => {
      getAnalyticsRealtime(website.id).then((r) => {
        if (r) setLiveData((prev) => ({ ...prev, activeVisitors: r.activeVisitors, recentEvents: r.recentEvents ?? prev.recentEvents }))
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
  const chartConfig: ChartConfig = {
    pageViews: {
      label: "Page Views",
      color: "#3b82f6",
    },
    uniqueSessions: {
      label: "Sessions",
      color: "#10b981",
    },
    formSubmissions: {
      label: "Form Submissions",
      color: "#8b5cf6",
    },
  }

  const deviceChartConfig: ChartConfig = {
    visitors: {
      label: "Visitors",
    },
    mobile: {
      label: "Mobile",
      color: "#3b82f6",
    },
    desktop: {
      label: "Desktop", 
      color: "#10b981",
    },
    tablet: {
      label: "Tablet",
      color: "#f59e0b",
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
        <div className="py-16 sm:py-24">
          <AnalyticsSkeleton />
        </div>
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

  return (
    <AppPageContainer fullWidth className="space-y-6 sm:space-y-8 md:space-y-10">
      {/* Header Section */}
      <div className="app-hero relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 sm:p-8 md:p-12">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground truncate">
                  Analytics Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed">
                Comprehensive insights and real-time analytics for {websiteName}
              </p>
              {websiteUrl && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {websiteUrl.replace(/^https?:\/\//, '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <LiveVisitorsBadges liveCount={liveViewersCount} connected={liveConnected} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground shrink-0">Time Range:</span>
                <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg">
                  {DATE_RANGES.map((range) => (
                    <Button
                      key={range.value}
                      variant={dateRange === range.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDateRange(range.value)}
                      className={`app-touch ${dateRange === range.value ? "shadow-sm" : "hover:bg-background/50"}`}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-background/50 backdrop-blur-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Section */}
      {overviewData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          <Card className="app-card group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="p-3 bg-blue-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Eye className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold mb-2 text-blue-900 dark:text-blue-100">
                {(overviewData.pageViews || 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Page Views</div>
            </CardContent>
          </Card>

          <Card className="app-card group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/20">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-3xl font-bold mb-2 text-emerald-900 dark:text-emerald-100">
                {(overviewData.uniqueSessions || 0).toLocaleString()}
              </div>
              <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Unique Sessions</div>
            </CardContent>
          </Card>

          <Card className="app-card group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/30 dark:to-amber-900/20">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="p-3 bg-amber-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-3xl font-bold mb-2 text-amber-900 dark:text-amber-100">
                {formatDuration(overviewData.avgDuration || 0)}
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">Avg. Session</div>
            </CardContent>
          </Card>

          <LiveViewersMetricCard liveCount={liveViewersCount} connected={liveConnected} />

          <Card className="app-card group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="p-3 bg-purple-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-3xl font-bold mb-2 text-purple-900 dark:text-purple-100">
                {(overviewData?.formSubmissions || 0).toLocaleString()}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Form Submissions</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Traffic Over Time Chart */}
        <Card className="app-card border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg">
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
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return dateRange === "24h" 
                          ? date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })
                          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      }}
                    />
                    <YAxis
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      domain={[0, "dataMax"]}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <defs>
                      <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillFormSubmissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="uniqueSessions"
                      type="monotone"
                      fill="url(#fillSessions)"
                      fillOpacity={0.6}
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                    />
                    <Area
                      dataKey="pageViews"
                      type="monotone"
                      fill="url(#fillPageViews)"
                      fillOpacity={0.6}
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2, fill: "#ffffff" }}
                    />
                    <Area
                      dataKey="formSubmissions"
                      type="monotone"
                      fill="url(#fillFormSubmissions)"
                      fillOpacity={0.6}
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#8b5cf6", strokeWidth: 2, fill: "#ffffff" }}
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

        {/* Top Pages */}
        <Card className="app-card border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg">
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
                  
                  // Clean up the route - ensure it starts with / and remove domain/protocol
                  let cleanRoute = page.key
                  if (cleanRoute.includes('://')) {
                    cleanRoute = new URL(cleanRoute).pathname
                  }
                  if (!cleanRoute.startsWith('/')) {
                    cleanRoute = `/${cleanRoute}`
                  }
                  if (cleanRoute === '/') {
                    cleanRoute = '/home'
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] border border-transparent hover:border-primary/10"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-primary/80 to-primary text-white text-sm font-bold shadow-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate font-mono">
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
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}15` }}>
                          {getDeviceIcon(device.key)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold capitalize text-sm">{device.key}</div>
                          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="text-xs font-semibold"
                          style={{ 
                            backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20`,
                            color: CHART_COLORS[index % CHART_COLORS.length],
                            border: `1px solid ${CHART_COLORS[index % CHART_COLORS.length]}40`
                          }}
                        >
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
                  const countryColor = CHART_COLORS[index % CHART_COLORS.length]

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] border border-transparent hover:border-primary/10"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                          style={{ 
                            background: `linear-gradient(135deg, ${countryColor}dd, ${countryColor})` 
                          }}
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
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ 
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${countryColor}80, ${countryColor})`
                            }}
                          />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="font-semibold px-3 py-1"
                          style={{
                            backgroundColor: `${countryColor}20`,
                            color: countryColor,
                            border: `1px solid ${countryColor}40`
                          }}
                        >
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

      {/* Form Submissions Section */}
      {website && (
        <div className="grid grid-cols-1 gap-8">
          <FormSubmissionsInfo websiteId={website.id} />
        </div>
      )}

      {/* Real-time Activity Section - Only show if there's activity */}
       {shouldShowLiveActivity() && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
          {/* Live Activity Feed */}
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
                        <div className="text-sm text-muted-foreground truncate font-mono bg-muted/50 px-2 py-1 rounded text-xs">
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
      {/* Footer Section */}
      <Card className="app-card border-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold mb-1">Analytics Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Real-time insights powered by advanced analytics • Last updated: {new Date().toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Data
              </Badge>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppPageContainer>
  )
}