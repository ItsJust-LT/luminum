"use client"

import { useState } from "react"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, BarChart3 } from "lucide-react"

interface AnalyticsChartProps {
  data: Array<{
    time: string
    pageViews: number
    uniqueSessions: number
    formSubmissions?: number
  }>
  title: string
  description: string
}

export function AnalyticsChart({ 
  data, 
  title, 
  description
}: AnalyticsChartProps) {
  const safeData = Array.isArray(data) ? data : []
  
  // Internal state for toggle controls
  const [showPageViews, setShowPageViews] = useState(true)
  const [showUniqueSessions, setShowUniqueSessions] = useState(true)
  const [showFormSubmissions, setShowFormSubmissions] = useState(true)

  const isWithin24Hours =
    safeData.length > 0 &&
    safeData.every((item, index) => {
      if (index === 0) return true
      const current = new Date(item.time)
      const first = new Date(safeData[0].time)
      const diffHours = Math.abs(current.getTime() - first.getTime()) / (1000 * 60 * 60)
      return diffHours <= 24
    })

  const chartData = safeData.map((item) => ({
    ...item,
    date: item?.time
      ? isWithin24Hours
        ? new Date(item.time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: new Date(item.time).getMinutes() === 0 ? undefined : "2-digit",
            hour12: true,
          })
        : new Date(item.time).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
      : "N/A",
    pageViews: item?.pageViews || 0,
    uniqueSessions: item?.uniqueSessions || 0,
    formSubmissions: item?.formSubmissions || 0,
  }))

  const chartConfig = {
    ...(showPageViews && {
      pageViews: {
        label: "Page Views",
        color: "var(--chart-1)",
      },
    }),
    ...(showUniqueSessions && {
      uniqueSessions: {
        label: "Unique Sessions",
        color: "var(--chart-2)",
      },
    }),
    ...(showFormSubmissions && {
      formSubmissions: {
        label: "Form Submissions",
        color: "var(--chart-3)",
      },
    }),
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>
          </div>
          
          {/* Toggle Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>Metrics:</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant={showPageViews ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowPageViews(!showPageViews)}
                className={`h-7 px-2 text-xs ${showPageViews ? "shadow-sm" : "hover:bg-muted/50"}`}
              >
                {showPageViews ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                Views
              </Button>
              <Button
                variant={showUniqueSessions ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowUniqueSessions(!showUniqueSessions)}
                className={`h-7 px-2 text-xs ${showUniqueSessions ? "shadow-sm" : "hover:bg-muted/50"}`}
              >
                {showUniqueSessions ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                Sessions
              </Button>
              <Button
                variant={showFormSubmissions ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowFormSubmissions(!showFormSubmissions)}
                className={`h-7 px-2 text-xs ${showFormSubmissions ? "shadow-sm" : "hover:bg-muted/50"}`}
              >
                {showFormSubmissions ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                Forms
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        {chartData.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
            <div className="text-center space-y-2">
              <div className="text-lg font-medium">No data available</div>
              <div className="text-sm opacity-70">Chart will appear when data is loaded</div>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis
                  dataKey="date"
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  domain={[0, "dataMax"]}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-40"
                      nameKey="name"
                      labelFormatter={(value) => `${isWithin24Hours ? "Time" : "Date"}: ${value}`}
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
                  <linearGradient id="fillFormSubmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-formSubmissions)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-formSubmissions)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                {showUniqueSessions && (
                  <Area
                    dataKey="uniqueSessions"
                    type="linear"
                    fill="url(#fillUniqueSessions)"
                    fillOpacity={0.4}
                    stroke="var(--color-uniqueSessions)"
                    strokeWidth={3}
                    connectNulls={false}
                  />
                )}
                {showPageViews && (
                  <Area
                    dataKey="pageViews"
                    type="linear"
                    fill="url(#fillPageViews)"
                    fillOpacity={0.4}
                    stroke="var(--color-pageViews)"
                    strokeWidth={3}
                    connectNulls={false}
                  />
                )}
                {showFormSubmissions && (
                  <Area
                    dataKey="formSubmissions"
                    type="linear"
                    fill="url(#fillFormSubmissions)"
                    fillOpacity={0.4}
                    stroke="var(--color-formSubmissions)"
                    strokeWidth={3}
                    connectNulls={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
        
        {/* Legend */}
        {chartData.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Legend:</span>
            </div>
            {showPageViews && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--color-pageViews)" }} />
                <span className="text-xs text-muted-foreground">Page Views</span>
              </div>
            )}
            {showUniqueSessions && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--color-uniqueSessions)" }} />
                <span className="text-xs text-muted-foreground">Unique Sessions</span>
              </div>
            )}
            {showFormSubmissions && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--color-formSubmissions)" }} />
                <span className="text-xs text-muted-foreground">Form Submissions</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
