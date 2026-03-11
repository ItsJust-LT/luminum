"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Wifi, WifiOff, Activity } from "lucide-react"

export interface LiveVisitorsCounterProps {
  liveCount: number
  connected: boolean
}

/**
 * Badges for connection status and live viewers count.
 * Use in header/toolbar next to other controls.
 */
export function LiveVisitorsBadges({ liveCount, connected }: LiveVisitorsCounterProps) {
  return (
    <>
      <Badge
        variant={connected ? "default" : "secondary"}
        className={`flex items-center gap-2 px-4 py-2 ${
          connected
            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
            : ""
        }`}
      >
        {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {connected ? "Live Connected" : "Disconnected"}
      </Badge>
      <Badge
        variant="outline"
        className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
      >
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
        {liveCount} live viewers
      </Badge>
    </>
  )
}

/**
 * Metric card for the "Live Viewers" stat in the dashboard grid.
 * Same styling as other metric cards; shows live count and connection state.
 */
export function LiveViewersMetricCard({ liveCount, connected }: LiveVisitorsCounterProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20 ring-2 ring-green-200 dark:ring-green-800">
      <CardContent className="p-6 text-center">
        <div className="p-3 bg-green-500/10 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
          <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-3xl font-bold mb-2 text-green-900 dark:text-green-100">
          {liveCount}
        </div>
        <div className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
          Live Viewers
        </div>
      </CardContent>
    </Card>
  )
}
