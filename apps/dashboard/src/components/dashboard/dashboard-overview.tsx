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
                <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg mx-auto mb-3 sm:mb-4" />
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
          <Card className="app-card overflow-hidden transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="bg-primary/10 mx-auto mb-3 w-fit rounded-lg p-2.5 sm:mb-4 sm:p-3">
                <Eye className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="text-foreground mb-1 text-xl font-bold tabular-nums sm:mb-2 sm:text-2xl md:text-3xl">
                {(overview?.pageViews ?? 0).toLocaleString()}
              </div>
              <div className="text-muted-foreground text-sm font-medium">Page views</div>
            </CardContent>
          </Card>
          <Card className="app-card overflow-hidden transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="bg-primary/10 mx-auto mb-3 w-fit rounded-lg p-2.5 sm:mb-4 sm:p-3">
                <Users className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="text-foreground mb-1 text-xl font-bold tabular-nums sm:mb-2 sm:text-2xl md:text-3xl">
                {(overview?.uniqueVisitors ?? 0).toLocaleString()}
              </div>
              <div className="text-muted-foreground text-sm font-medium">Visitors</div>
            </CardContent>
          </Card>
          <Card className="app-card overflow-hidden border-primary/20 transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="bg-primary/10 mx-auto mb-3 flex w-fit items-center justify-center gap-1.5 rounded-lg p-2.5 sm:mb-4 sm:p-3">
                <Activity className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${liveConnected ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`}
                  title={liveConnected ? "Live" : "Disconnected"}
                />
              </div>
              <div className="text-foreground mb-1 text-xl font-bold tabular-nums sm:mb-2 sm:text-2xl md:text-3xl">{liveViewers}</div>
              <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm font-medium">
                Live now
              </div>
            </CardContent>
          </Card>
          <Card className="app-card overflow-hidden transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center">
              <div className="bg-primary/10 mx-auto mb-3 w-fit rounded-lg p-2.5 sm:mb-4 sm:p-3">
                <FileText className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="text-foreground mb-1 text-xl font-bold tabular-nums sm:mb-2 sm:text-2xl md:text-3xl">
                {overview?.formSubmissions ?? 0}
              </div>
              <div className="text-muted-foreground text-sm font-medium">Form submissions</div>
            </CardContent>
          </Card>
          {blogsEnabled ? (
            <>
              <Card className="app-card overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="p-4 sm:p-5 md:p-6 text-center">
                  <div className="bg-primary/10 mx-auto mb-3 w-fit rounded-lg p-2.5 sm:mb-4 sm:p-3">
                    <BookOpen className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="text-foreground mb-1 text-xl font-bold tabular-nums sm:mb-2 sm:text-2xl md:text-3xl">
                    {(overview?.blogCategoryViews ?? 0).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm font-medium">Blog category views</div>
                </CardContent>
              </Card>
              <Card className="app-card overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="p-4 sm:p-5 md:p-6 text-center">
                  <div className="bg-primary/10 mx-auto mb-3 w-fit rounded-lg p-2.5 sm:mb-4 sm:p-3">
                    <BookOpen className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="text-foreground mb-1 text-xl font-bold tabular-nums sm:mb-2 sm:text-2xl md:text-3xl">
                    {(overview?.blogPublishedPosts ?? 0).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm font-medium">Published posts</div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      {/* Demographics – above forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="app-card flex flex-col overflow-hidden">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
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
                      className="bg-muted/40 flex items-center gap-3 rounded-lg px-4 py-3 backdrop-blur-sm transition-colors hover:bg-muted/60"
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

        <Card className="app-card overflow-hidden">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
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
                      className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-4 py-3 backdrop-blur-sm transition-colors hover:bg-muted/60"
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
