"use client"

import { useState } from "react"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, BarChart3 } from "lucide-react"
import {
  type ChartTimeGranularity,
  formatChartAxisTick,
  formatChartTooltipTime,
} from "@/lib/analytics/chart-time-format"

interface AnalyticsChartProps {
  data: Array<{
    time: string
    pageViews: number
    uniqueSessions: number
  }>
  title: string
  description: string
  /** Defaults to day-level axis labels */
  timeGranularity?: ChartTimeGranularity
}

export function AnalyticsChart({
  data,
  title,
  description,
  timeGranularity = "day",
}: AnalyticsChartProps) {
  const safeData = Array.isArray(data) ? data : []

  const [showPageViews, setShowPageViews] = useState(true)
  const [showUniqueSessions, setShowUniqueSessions] = useState(true)

  const chartData = safeData.map((item) => ({
    time: item.time,
    pageViews: item.pageViews || 0,
    uniqueSessions: item.uniqueSessions || 0,
  }))

  const chartConfig = {
    ...(showPageViews && {
      pageViews: {
        label: "Page views",
        color: "var(--chart-1)",
      },
    }),
    ...(showUniqueSessions && {
      uniqueSessions: {
        label: "Sessions",
        color: "var(--chart-2)",
      },
    }),
  }

  return (
    <Card className="app-card w-full border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              <span>Show</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                variant={showPageViews ? "default" : "ghost"}
                size="sm"
                type="button"
                onClick={() => setShowPageViews(!showPageViews)}
                className="h-7 px-2 text-xs"
              >
                {showPageViews ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                Views
              </Button>
              <Button
                variant={showUniqueSessions ? "default" : "ghost"}
                size="sm"
                type="button"
                onClick={() => setShowUniqueSessions(!showUniqueSessions)}
                className="h-7 px-2 text-xs"
              >
                {showUniqueSessions ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                Sessions
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        {chartData.length === 0 ? (
          <div className="border-border text-muted-foreground flex h-[320px] items-center justify-center rounded-lg border border-dashed">
            <div className="space-y-2 text-center">
              <div className="text-foreground text-base font-medium">No data yet</div>
              <div className="text-sm opacity-80">Chart appears when traffic is recorded</div>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis
                  dataKey="time"
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                  minTickGap={24}
                  tickFormatter={(v) => formatChartAxisTick(v, timeGranularity)}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  dx={-8}
                  domain={[0, "dataMax"]}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="min-w-[10rem]"
                      labelFormatter={(label) => formatChartTooltipTime(label, timeGranularity)}
                    />
                  }
                />
                <defs>
                  <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-pageViews)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-pageViews)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillUniqueSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-uniqueSessions)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-uniqueSessions)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                {showUniqueSessions && (
                  <Area
                    dataKey="uniqueSessions"
                    type="monotone"
                    fill="url(#fillUniqueSessions)"
                    fillOpacity={0.35}
                    stroke="var(--color-uniqueSessions)"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={false}
                  />
                )}
                {showPageViews && (
                  <Area
                    dataKey="pageViews"
                    type="monotone"
                    fill="url(#fillPageViews)"
                    fillOpacity={0.35}
                    stroke="var(--color-pageViews)"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {chartData.length > 0 && (
          <div className="border-border text-muted-foreground mt-3 flex flex-wrap items-center justify-center gap-4 border-t pt-3 text-xs">
            {showPageViews && (
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--color-pageViews)" }} />
                <span>Page views</span>
              </div>
            )}
            {showUniqueSessions && (
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--color-uniqueSessions)" }} />
                <span>Sessions</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
