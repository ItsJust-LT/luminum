"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Users, FileText, Eye, Clock, Wifi, WifiOff } from "lucide-react"
import { getAnalyticsRealtime } from "@/lib/actions/analytics"
import { getFormSubmissions } from "@/lib/actions/forms"
import { useAnalyticsPresence } from "@/lib/ably/client"
import { formatDuration } from "@/lib/utils"

interface RealtimeMetricsProps {
  websiteId: string
}

interface RealtimeData {
  activeVisitors: number
  pageViewsLastHour: number
  formSubmissionsLastHour: number
  avgSessionDuration: number
  topPagesNow: Array<{ path: string; viewers: number }>
  recentEvents: Array<{ type: string; path: string; timestamp: string }>
}

export function RealtimeMetrics({ websiteId }: RealtimeMetricsProps) {
  const { liveCount, connected: wsConnected } = useAnalyticsPresence(websiteId)
  const [data, setData] = useState<RealtimeData>({
    activeVisitors: 0,
    pageViewsLastHour: 0,
    formSubmissionsLastHour: 0,
    avgSessionDuration: 0,
    topPagesNow: [],
    recentEvents: [],
  })

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [realtimeData, formResult] = await Promise.all([
          getAnalyticsRealtime(websiteId),
          getFormSubmissions(websiteId),
        ])

        const formTotal = formResult?.success && formResult.submissions ? formResult.submissions.length : 0

        if (realtimeData) {
          setData({
            activeVisitors: realtimeData.activeVisitors ?? 0,
            pageViewsLastHour: realtimeData.pageviewsLast30Min ?? 0,
            formSubmissionsLastHour: formTotal,
            avgSessionDuration: 0,
            topPagesNow:
              realtimeData.topPages
                ?.map((page) => ({ path: page.key, viewers: page.count }))
                .slice(0, 5) ?? [],
            recentEvents:
              realtimeData.recentEvents?.map((event) => ({
                type: "pageview",
                path: event.url,
                timestamp: event.timestamp,
              })) ?? [],
          })
        }
      } catch (error) {
        console.error("Failed to fetch initial realtime data:", error)
      }
    }

    fetchInitialData()
  }, [websiteId])

  // Keep activeVisitors in sync with live WebSocket count
  useEffect(() => {
    setData((prev) => ({ ...prev, activeVisitors: liveCount }))
  }, [liveCount])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Metrics
            </div>
            <Badge variant={wsConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {wsConnected ? "Live" : "Disconnected"}
            </Badge>
          </CardTitle>
          <CardDescription>Live website activity and visitor behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
              <Users className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <div className="text-3xl font-bold text-green-600 mb-1">{data.activeVisitors}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active Visitors
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Eye className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <div className="text-3xl font-bold text-blue-600 mb-1">{data.pageViewsLastHour}</div>
              <div className="text-sm text-muted-foreground">Views (Last 30min)</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
              <FileText className="h-8 w-8 mx-auto mb-3 text-purple-600" />
              <div className="text-3xl font-bold text-purple-600 mb-1">{data.formSubmissionsLastHour}</div>
              <div className="text-sm text-muted-foreground">Form Submissions</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
              <Clock className="h-8 w-8 mx-auto mb-3 text-orange-600" />
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {formatDuration(data.avgSessionDuration || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Session</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Pages</CardTitle>
            <CardDescription>Pages with current visitors</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topPagesNow.length > 0 ? (
              <div className="space-y-3">
                {data.topPagesNow.map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-medium">{page.path}</span>
                    </div>
                    <Badge variant="secondary">{page.viewers} viewers</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No active pages right now</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest visitor actions</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentEvents.length > 0 ? (
              <div className="space-y-3">
                {data.recentEvents.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <div className="font-medium">{event.type}</div>
                      <div className="text-sm text-muted-foreground">{event.path}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
