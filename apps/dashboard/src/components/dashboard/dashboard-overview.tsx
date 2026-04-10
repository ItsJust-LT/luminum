"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Eye,
  Users,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  ArrowRight,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react"
import type { MetricCount } from "@/lib/types/analytics"
import type { TimeSeriesPoint } from "@/lib/types/analytics"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalyticsPresence } from "@/lib/ably/client"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cleanAnalyticsPath } from "@/lib/analytics/clean-route"
import { cn } from "@/lib/utils"
import {
  formatChartAxisTick,
  formatChartTooltipTime,
} from "@/lib/analytics/chart-time-format"

interface DashboardOverviewProps {
  websiteId: string
  organizationSlug: string
  analyticsEnabled: boolean
}

interface OverviewData {
  pageViews: number
  uniqueVisitors: number
  avgSessionDuration: number
}

const trafficChartConfig = {
  pageViews: { label: "Page views", color: "var(--color-chart-1)" },
  uniqueSessions: { label: "Sessions", color: "var(--color-chart-2)" },
} satisfies ChartConfig

export function DashboardOverview({ websiteId, organizationSlug, analyticsEnabled }: DashboardOverviewProps) {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [apiLiveViewers, setApiLiveViewers] = useState(0)
  const [deviceData, setDeviceData] = useState<MetricCount[]>([])
  const [countryData, setCountryData] = useState<MetricCount[]>([])
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [topPages, setTopPages] = useState<MetricCount[]>([])
  const [loading, setLoading] = useState(true)
  const fetchData = useCallback(async () => {
    if (!analyticsEnabled) {
      setLoading(false)
      return
    }
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 7)
      const startStr = start.toISOString()
      const endStr = end.toISOString()

      const [overviewRes, realtimeRes, devicesRes, countriesRes, tsRes, pagesRes] = await Promise.all([
        api.analytics.getOverview(websiteId, startStr, endStr).catch(() => null),
        api.analytics.getRealtime(websiteId).catch(() => null),
        api.analytics.getDevices(websiteId, startStr, endStr, 5).catch(() => []),
        api.analytics.getCountries(websiteId, startStr, endStr, 6).catch(() => []),
        api.analytics.getTimeSeries(websiteId, startStr, endStr, "day").catch(() => null),
        api.analytics.getTopPages(websiteId, startStr, endStr, 6).catch(() => []),
      ])

      if (overviewRes && typeof overviewRes === "object") {
        const o = overviewRes as {
          pageViews?: number
          uniqueSessions?: number
          avgDuration?: number
        }
        setOverview({
          pageViews: o.pageViews || 0,
          uniqueVisitors: o.uniqueSessions || 0,
          avgSessionDuration: o.avgDuration || 0,
        })
      }
      setApiLiveViewers((realtimeRes as { activeVisitors?: number } | null)?.activeVisitors ?? 0)
      setDeviceData((devicesRes ?? []) as MetricCount[])
      setCountryData((countriesRes ?? []) as MetricCount[])
      const ts = tsRes as { data?: TimeSeriesPoint[] } | null
      setTimeSeries(Array.isArray(ts?.data) ? ts!.data! : [])
      setTopPages((pagesRes ?? []) as MetricCount[])
    } catch (e) {
      console.error("Dashboard overview fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [websiteId, analyticsEnabled])

  const { liveCount: presenceLiveCount, connected: presenceConnected } = useAnalyticsPresence(
    analyticsEnabled ? websiteId : null
  )
  const liveViewers = presenceConnected ? presenceLiveCount : apiLiveViewers
  const liveConnected = presenceConnected

  useEffect(() => {
    if (analyticsEnabled) void fetchData()
    else setLoading(false)
  }, [fetchData, analyticsEnabled])

  if (!analyticsEnabled) {
    return (
      <div className="app-card overflow-hidden border border-dashed border-muted-foreground/25">
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-20 md:py-24">
          <div className="mb-4 rounded-full bg-muted/50 p-6">
            <LayoutDashboard className="text-muted-foreground h-12 w-12" />
          </div>
          <h3 className="text-foreground mb-1 text-lg font-semibold">Analytics is off</h3>
          <p className="text-muted-foreground mb-6 max-w-sm text-sm">
            Turn on analytics for this site to see traffic charts here. Full reports stay on the Analytics page.
          </p>
          <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
            <Link href={`/${organizationSlug}/analytics`}>
              Open Analytics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <Skeleton className="h-20 w-full rounded-2xl sm:h-[5.25rem]" />
        <Skeleton className="h-[260px] w-full rounded-xl sm:h-[300px]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const fmtDur = (sec: number) => {
    if (!sec || sec < 1) return "—"
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">Website traffic</h2>
            <p className="text-muted-foreground text-sm">Last 7 days · sessions and page views from your site</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-2 self-start sm:self-auto" asChild>
            <Link href={`/${organizationSlug}/analytics`}>
              Full analytics
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="border-border/60 bg-card mb-4 flex flex-col gap-3 rounded-2xl border p-3 sm:p-4">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="bg-muted/35 flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl px-3 py-2.5 sm:min-w-[9rem] sm:px-4 sm:py-3">
              <div className="bg-primary/12 rounded-lg p-2">
                <Eye className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">Views</p>
                <p className="text-foreground text-lg font-bold tabular-nums sm:text-xl">
                  {(overview?.pageViews ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-muted/35 flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl px-3 py-2.5 sm:min-w-[9rem] sm:px-4 sm:py-3">
              <div className="bg-primary/12 rounded-lg p-2">
                <Users className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">Sessions</p>
                <p className="text-foreground text-lg font-bold tabular-nums sm:text-xl">
                  {(overview?.uniqueVisitors ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="border-primary/15 bg-primary/[0.06] flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl border px-3 py-2.5 ring-1 ring-primary/10 sm:min-w-[9rem] sm:px-4 sm:py-3">
              <div className="bg-primary/12 flex items-center gap-1.5 rounded-lg p-2">
                <Activity className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${liveConnected ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">Live</p>
                <p className="text-foreground text-lg font-bold tabular-nums sm:text-xl">{liveViewers}</p>
              </div>
            </div>
            <div className="bg-muted/20 flex min-w-[8rem] flex-[1.15] items-center gap-3 rounded-xl border border-dashed border-border/60 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="text-muted-foreground hidden text-[10px] font-semibold uppercase tracking-wider sm:block sm:w-14 sm:shrink-0">
                Avg
                <br />
                visit
              </div>
              <div className="min-w-0 flex-1 sm:text-right">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:hidden">Avg. session</p>
                <p className="text-foreground font-semibold tabular-nums sm:text-xl">{fmtDur(overview?.avgSessionDuration ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="app-card overflow-hidden">
          <CardHeader className="pb-2 pt-4 sm:pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="bg-primary/10 rounded-lg p-2">
                <TrendingUp className="text-primary h-4 w-4" />
              </div>
              Visits over time
            </CardTitle>
            <CardDescription>Daily page views and unique sessions</CardDescription>
          </CardHeader>
          <CardContent className="pb-4 sm:pb-5">
            {timeSeries.length > 0 ? (
              <ChartContainer config={trafficChartConfig} className="aspect-auto h-[240px] w-full sm:h-[280px]">
                <AreaChart data={timeSeries} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="homePv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="homeSess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    className="text-[10px] fill-muted-foreground"
                    tickFormatter={(v) => formatChartAxisTick(v, "day")}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent labelFormatter={(label) => formatChartTooltipTime(label, "day")} />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="uniqueSessions"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    fill="url(#homeSess)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#homePv)"
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
                No traffic data for this period yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {topPages.length > 0 ? (
        <Card className="app-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top pages</CardTitle>
            <CardDescription>Most viewed paths this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPages.map((p) => {
                const max = Math.max(1, ...topPages.map((x) => x.count || 0))
                const pct = ((p.count || 0) / max) * 100
                return (
                  <div key={p.key} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                    <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                      {(p.count || 0).toLocaleString()}
                    </span>
                    <div className="min-w-0 flex-1">
                      {p.title ? (
                        <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                      ) : null}
                      <p
                        className={cn(
                          "truncate font-mono text-xs sm:text-sm",
                          p.title ? "text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {cleanAnalyticsPath(p.key || "/")}
                      </p>
                      <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
                        <div className="bg-chart-1 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="app-card flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="bg-primary/10 rounded-lg p-2">
                <Smartphone className="text-primary h-5 w-5" />
              </div>
              Devices
            </CardTitle>
            <CardDescription>How people browse your site</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {deviceData.length > 0 ? (
              <div className="space-y-3">
                {deviceData.map((device) => {
                  const total = deviceData.reduce((s, d) => s + (d.count || 0), 0)
                  const pct = total > 0 ? ((device.count || 0) / total) * 100 : 0
                  const Icon = device.key === "mobile" ? Smartphone : Monitor
                  return (
                    <div
                      key={device.key}
                      className="bg-muted/40 flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">{device.key}</p>
                        <div className="bg-muted mt-1.5 h-2 overflow-hidden rounded-full">
                          <div
                            className="bg-chart-1/80 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-muted-foreground py-12 text-center">
                <Smartphone className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">No device data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="bg-primary/10 rounded-lg p-2">
                <Globe className="text-primary h-5 w-5" />
              </div>
              Top locations
            </CardTitle>
            <CardDescription>This week’s visitor geography</CardDescription>
          </CardHeader>
          <CardContent>
            {countryData.length > 0 ? (
              <div className="space-y-2">
                {countryData.slice(0, 6).map((c) => {
                  const total = countryData.reduce((s, x) => s + (x.count || 0), 0)
                  const pct = total > 0 ? ((c.count || 0) / total) * 100 : 0
                  return (
                    <div
                      key={c.key}
                      className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <span className="truncate text-sm font-medium">{c.key}</span>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="bg-muted h-2 w-20 overflow-hidden rounded-full">
                          <div
                            className="bg-chart-2/80 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-11 text-right text-xs tabular-nums">
                          {(c.count || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-muted-foreground py-12 text-center">
                <Globe className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">No location data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
