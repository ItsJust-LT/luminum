"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Eye,
  Users,
  Activity,
  FileText,
  Globe,
  Smartphone,
  Monitor,
  ArrowRight,
  LayoutDashboard,
  BookOpen,
} from "lucide-react"
import { FormSubmissionsInfo } from "@/components/analytics/form-submissions-info"
import type { MetricCount } from "@/lib/types/analytics"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganizationChannel, useAnalyticsPresence } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { useOrganization } from "@/lib/contexts/organization-context"

interface DashboardOverviewProps {
  websiteId: string
  organizationSlug: string
  analyticsEnabled: boolean
  blogsEnabled: boolean
}

interface OverviewData {
  pageViews: number
  uniqueVisitors: number
  avgSessionDuration: number
  formSubmissions: number
  blogCategoryViews: number
  blogPublishedPosts: number
}

export function DashboardOverview({
  websiteId,
  organizationSlug,
  analyticsEnabled,
  blogsEnabled,
}: DashboardOverviewProps) {
  const { organization } = useOrganization()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [apiLiveViewers, setApiLiveViewers] = useState(0)
  const [deviceData, setDeviceData] = useState<MetricCount[]>([])
  const [countryData, setCountryData] = useState<MetricCount[]>([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef<() => void>(() => {})

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

      const [overviewRes, realtimeRes, devicesRes, countriesRes] = await Promise.all([
        api.get("/api/analytics/overview", { websiteId, start: startStr, end: endStr }),
        api.get("/api/analytics/realtime", { websiteId }),
        api.get("/api/analytics/devices", { websiteId, start: startStr, end: endStr, limit: 5 }),
        api.get("/api/analytics/countries", { websiteId, start: startStr, end: endStr, limit: 6 }),
      ])

      if (overviewRes) {
        setOverview({
          pageViews: overviewRes.pageViews || 0,
          uniqueVisitors: overviewRes.uniqueSessions || 0,
          avgSessionDuration: overviewRes.avgDuration || 0,
          formSubmissions: overviewRes.formSubmissions || 0,
          blogCategoryViews: overviewRes.blogCategoryViews ?? 0,
          blogPublishedPosts: overviewRes.blogPublishedPosts ?? 0,
        })
      }
      setApiLiveViewers(realtimeRes?.activeVisitors ?? 0)
      setDeviceData(devicesRes ?? [])
      setCountryData(countriesRes ?? [])
    } catch (e) {
      console.error("Dashboard overview fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [websiteId, analyticsEnabled])

  fetchRef.current = fetchData

  useOrganizationChannel(
    analyticsEnabled && organization ? organization.id : null,
    useCallback((eventType: string) => {
      if (
        eventType === OrganizationEvents.FORM_SUBMISSION_CREATED ||
        eventType === OrganizationEvents.FORM_SUBMISSION_UPDATED
      ) {
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
    if (analyticsEnabled) fetchData()
    else setLoading(false)
  }, [fetchData, analyticsEnabled])

  if (!analyticsEnabled) {
    return (
      <div className="app-card border border-dashed border-muted-foreground/25 bg-card/50 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-24 px-4 sm:px-6 text-center">
          <div className="rounded-full bg-muted/50 p-4 sm:p-6 mb-3 sm:mb-4">
            <LayoutDashboard className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Analytics off</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-5 sm:mb-6">
            Enable analytics for this website to see an overview here. Open Analytics for full reporting.
          </p>
          <Button variant="outline" size="sm" asChild className="rounded-lg">
            <Link href={`/${organizationSlug}/analytics`} className="gap-2">
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
      <div className="space-y-5 sm:space-y-6 md:space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 bg-card/50 shadow-sm app-card overflow-hidden">
              <CardContent className="p-4 sm:p-6 text-center">
                <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl mx-auto mb-3 sm:mb-4" />
                <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 mx-auto mb-2" />
                <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-0 bg-card/50 shadow-sm app-card">
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-40 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-11 sm:h-12 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card/50 shadow-sm app-card">
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-36 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 md:space-y-8">
      {/* Key metrics – mobile-first grid */}
      <div>
        <h2 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 sm:mb-4">
          Last 7 days
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 app-card overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl w-fit mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-blue-900 dark:text-blue-100 tabular-nums">
                {(overview?.pageViews ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Page views</div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/20 app-card overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="p-2.5 sm:p-3 bg-emerald-500/10 rounded-xl w-fit mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-emerald-900 dark:text-emerald-100 tabular-nums">
                {(overview?.uniqueVisitors ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Visitors</div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20 app-card overflow-hidden ring-2 ring-green-200/50 dark:ring-green-800/50">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="p-2.5 sm:p-3 bg-green-500/10 rounded-xl w-fit mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform flex items-center justify-center gap-1.5">
                <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${liveConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`}
                  title={liveConnected ? "Live" : "Disconnected"}
                />
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-green-900 dark:text-green-100 tabular-nums">{liveViewers}</div>
              <div className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center justify-center gap-1.5">
                Live now
              </div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-cyan-50/50 to-cyan-100/30 dark:from-cyan-950/30 dark:to-cyan-900/20 app-card overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="p-2.5 sm:p-3 bg-cyan-500/10 rounded-xl w-fit mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-cyan-900 dark:text-cyan-100 tabular-nums">
                {overview?.formSubmissions ?? 0}
              </div>
              <div className="text-sm text-cyan-700 dark:text-cyan-300 font-medium">Form submissions</div>
            </CardContent>
          </Card>
          {blogsEnabled ? (
            <>
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 dark:from-indigo-950/30 dark:to-indigo-900/20 app-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 md:p-6 text-center">
                  <div className="p-2.5 sm:p-3 bg-indigo-500/10 rounded-xl w-fit mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-indigo-900 dark:text-indigo-100 tabular-nums">
                    {(overview?.blogCategoryViews ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Blog category views</div>
                </CardContent>
              </Card>
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-sky-50/50 to-sky-100/30 dark:from-sky-950/30 dark:to-sky-900/20 app-card overflow-hidden">
                <CardContent className="p-4 sm:p-5 md:p-6 text-center">
                  <div className="p-2.5 sm:p-3 bg-sky-500/10 rounded-xl w-fit mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-sky-900 dark:text-sky-100 tabular-nums">
                    {(overview?.blogPublishedPosts ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-sky-700 dark:text-sky-300 font-medium">Published posts</div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      {/* Demographics – above forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="flex flex-col border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg app-card overflow-hidden">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              Devices
            </CardTitle>
            <CardDescription>How visitors reach your site</CardDescription>
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
                      className="flex items-center gap-3 py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{device.key}</p>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs font-medium shrink-0">
                        {pct.toFixed(0)}%
                      </Badge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No device data yet</p>
                <p className="text-xs mt-1">Data appears when visitors use your site</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-background to-muted/10 shadow-lg app-card overflow-hidden">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              Top locations
            </CardTitle>
            <CardDescription>Where your visitors are from</CardDescription>
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
                      className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium truncate">{c.key}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                          {(c.count || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No location data yet</p>
                <p className="text-xs mt-1">Data appears when visitors use your site</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forms */}
      <FormSubmissionsInfo websiteId={websiteId} />
    </div>
  )
}
