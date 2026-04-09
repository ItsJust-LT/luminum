"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/ui/animated-number"
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
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
      >
        {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {connected ? "Live" : "Offline"}
      </Badge>
      <Badge variant="outline" className="border-border/80 bg-muted/50 flex items-center gap-1.5 px-3 py-1.5 tabular-nums">
        <div
          className={`h-2 w-2 rounded-full ${connected ? "bg-chart-2 animate-pulse" : "bg-muted-foreground/40"}`}
        />
        <AnimatedNumber value={liveCount} duration={600} /> <span className="text-muted-foreground font-normal">online</span>
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
    <Card className="app-card ring-primary/15 transition-shadow hover:shadow-md ring-1">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-chart-2 animate-pulse" : "bg-muted-foreground/50"}`}
            />
            Live now
          </p>
          <div className="text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-3xl">
            <AnimatedNumber value={liveCount} duration={600} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
