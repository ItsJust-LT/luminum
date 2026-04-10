"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAnalyticsPresence } from "@/lib/ably/client"
import { formatDuration } from "@/lib/utils"
import { Eye, Users, Clock, TrendingUp, Activity, FileText, BarChart3, Loader2 } from "lucide-react"

interface AnalyticsOverviewProps {
  websiteId: string
  analyticsEnabled: boolean
}

interface OverviewData {
  pageViews: number
  uniqueVisitors: number
  avgSessionDuration: number
  bounceRate: number
}

export function AnalyticsOverview({ websiteId, analyticsEnabled }: AnalyticsOverviewProps) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [recentFormSubmissions, setRecentFormSubmissions] = useState(0)
  const [loading, setLoading] = useState(true)
  const { liveCount: liveViewers } = useAnalyticsPresence(analyticsEnabled ? websiteId : null)

  useEffect(() => {
    if (!analyticsEnabled) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const end = new Date()
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days

        const [overview, realtime] = await Promise.all([
          api.get("/api/analytics/overview", { websiteId, start: start.toISOString(), end: end.toISOString() }),
          api.get("/api/analytics/realtime", { websiteId }),
        ])

        const ov = overview as { pageViews?: number; uniqueSessions?: number; avgDuration?: number } | null
        const mappedData: OverviewData = {
          pageViews: ov?.pageViews ?? 0,
          uniqueVisitors: ov?.uniqueSessions ?? 0,
          avgSessionDuration: ov?.avgDuration ?? 0,
          bounceRate: 0,
        }
        setData(mappedData)
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [websiteId, analyticsEnabled])

  if (!analyticsEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics
          </CardTitle>
          <CardDescription>Website analytics tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Analytics is currently disabled for this website.</p>
            <p className="text-sm text-muted-foreground mt-2">Contact an administrator to enable analytics tracking.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics
          </CardTitle>
          <CardDescription>Website analytics tracking</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin" aria-hidden />
          <p className="text-sm">Loading analytics…</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics
          </CardTitle>
          <CardDescription>Website analytics tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="mb-6 rounded-2xl bg-muted/30 p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <BarChart3 className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Data Yet</h3>
              <p className="text-muted-foreground mb-4">
                Your website analytics will appear here once visitors start browsing your site.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Share your website link to get visitors</p>
                <p>• Analytics data updates in real-time</p>
                <p>• Check back after some traffic</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics Overview
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {liveViewers} live
              </Badge>
              {recentFormSubmissions > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {recentFormSubmissions} recent submissions
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>Website performance metrics with real-time updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{(data.pageViews || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Page Views</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{(data.uniqueVisitors || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Unique Visitors</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {formatDuration(data.avgSessionDuration || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Session</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted/50 border-2 border-green-200">
              <Activity className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{liveViewers}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live Viewers
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
