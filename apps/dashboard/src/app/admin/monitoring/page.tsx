"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Server, Cpu, HardDrive, MemoryStick, Activity, Clock, Wifi, Activity as PulseIcon, Database, Cloud } from "lucide-react"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Line, LineChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { api } from "@/lib/api"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { AnimatedNumber } from "@/components/ui/animated-number"

function formatBytes(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " GB"
  if (n >= 1e6) return (n / 1e6).toFixed(2) + " MB"
  if (n >= 1e3) return (n / 1e3).toFixed(2) + " KB"
  return String(n)
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(" ")
}

interface StorageBreakdown {
  database_bytes?: number | null
  s3_bytes?: number | null
  database_error?: string
  s3_error?: string
}

interface MetricPoint {
  created_at: string
  time: string
  cpu_usage_percent?: number | null
  process_cpu_usage_percent?: number | null
  memory_usage_percent?: number | null
  load_avg_1m?: number | null
  load_avg_5m?: number | null
  load_avg_15m?: number | null
  disk_usage_percent?: number | null
}

interface CurrentSnapshot {
  hostname?: string
  platform?: string
  node_version?: string
  cpu_usage_percent?: number | null
  process_cpu_usage_percent?: number | null
  cpu_cores?: number
  memory_usage_percent?: number | null
  memory_used_bytes?: number
  memory_total_bytes?: number
  process_rss_bytes?: number
  process_heap_used_bytes?: number
  process_heap_total_bytes?: number
  process_uptime_seconds?: number
  system_uptime_seconds?: number
  load_avg_1m?: number
  load_avg_5m?: number
  load_avg_15m?: number
  disk_usage_percent?: number | null
  disk_used_bytes?: number | null
  disk_total_bytes?: number | null
  storage_breakdown?: StorageBreakdown
  id?: string
  created_at?: string
}

const CHART_CPU = "#0ea5e9"
const CHART_MEM = "#8b5cf6"
const CHART_LOAD1 = "#f59e0b"
const CHART_LOAD5 = "#10b981"
const CHART_LOAD15 = "#6366f1"
const CHART_DISK = "#ec4899"

const cpuMemoryChartConfig: ChartConfig = {
  process_cpu_usage_percent: { label: "Process CPU %", color: CHART_CPU },
  cpu_usage_percent: { label: "System CPU %", color: "#64748b" },
  memory_usage_percent: { label: "Memory %", color: CHART_MEM },
}

const loadChartConfig: ChartConfig = {
  load_avg_1m: { label: "Load 1m", color: CHART_LOAD1 },
  load_avg_5m: { label: "Load 5m", color: CHART_LOAD5 },
  load_avg_15m: { label: "Load 15m", color: CHART_LOAD15 },
}

const diskChartConfig: ChartConfig = {
  disk_usage_percent: { label: "Disk %", color: CHART_DISK },
}

const MAX_LIVE_POINTS = 120 // ~10 min at 5s interval

export default function AdminMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<CurrentSnapshot | null>(null)
  const [history, setHistory] = useState<MetricPoint[]>([])
  const livePointsRef = useRef<MetricPoint[]>([])
  const { connected, onMessage } = useRealtime()

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = (await api.admin.getServerMetrics()) as {
        success?: boolean
        current?: CurrentSnapshot
        history?: Array<Record<string, unknown>>
      }
      if (result?.success && result.current) {
        setCurrent(result.current)
        const hist = (result.history ?? []).map((h: Record<string, unknown>) => ({
          ...h,
          process_cpu_usage_percent: (h as { process_cpu_usage_percent?: number }).process_cpu_usage_percent ?? (h as { cpu_usage_percent?: number }).cpu_usage_percent,
          time: new Date((h.created_at as string) || 0).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        })) as MetricPoint[]
        setHistory(hist)
        livePointsRef.current = hist.slice(-MAX_LIVE_POINTS)
      } else {
        setError((result as { error?: string })?.error || "Failed to load metrics")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  useEffect(() => {
    const unsub = onMessage("monitoring:metrics", (data: CurrentSnapshot) => {
      if (!data) return
      setCurrent((prev) => ({ ...prev, ...data }))
      const created_at = new Date().toISOString()
      const point: MetricPoint = {
        created_at,
        time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        cpu_usage_percent: data.cpu_usage_percent ?? undefined,
        process_cpu_usage_percent: data.process_cpu_usage_percent ?? data.cpu_usage_percent ?? undefined,
        memory_usage_percent: data.memory_usage_percent ?? undefined,
        load_avg_1m: data.load_avg_1m,
        load_avg_5m: data.load_avg_5m,
        load_avg_15m: data.load_avg_15m,
        disk_usage_percent: data.disk_usage_percent ?? undefined,
      }
      livePointsRef.current = [...livePointsRef.current.slice(-(MAX_LIVE_POINTS - 1)), point]
      setHistory(livePointsRef.current)
    })
    return unsub
  }, [onMessage])

  const chartData = history.length > 0 ? history : []

  if (loading && !current) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Server Monitoring</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Server Monitoring
            {connected && (
              <Badge variant="secondary" className="font-normal gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <Wifi className="h-3 w-3" />
                Live
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            API server resources and metrics. Updates in real time over WebSocket when connected.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh history
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {current && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Host</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold truncate" title={current.hostname}>
                  {current.hostname ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {current.platform ?? "—"} · Node {current.node_version ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold tabular-nums">
                  {formatUptime(current.process_uptime_seconds ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Process · System: {formatUptime(current.system_uptime_seconds ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CPU</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold tabular-nums">
                  {(current.process_cpu_usage_percent ?? current.cpu_usage_percent) != null ? (
                    <AnimatedNumber
                      value={current.process_cpu_usage_percent ?? current.cpu_usage_percent ?? 0}
                      format={(n) => `${n.toFixed(1)}%`}
                      chaseDuration={400}
                      className="text-foreground"
                    />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{current.cpu_cores ?? 0} cores</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Memory</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold tabular-nums">
                  {current.memory_usage_percent != null ? (
                    <AnimatedNumber
                      value={current.memory_usage_percent}
                      format={(n) => `${n.toFixed(1)}%`}
                      chaseDuration={400}
                      className="text-foreground"
                    />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(current.memory_used_bytes ?? 0)} / {formatBytes(current.memory_total_bytes ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden transition-all duration-300 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Process memory
                </CardTitle>
                <CardDescription className="text-xs">RSS and heap usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground text-xs">RSS</p>
                    <p className="font-mono font-semibold tabular-nums">
                      {formatBytes(current.process_rss_bytes ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground text-xs">Heap used</p>
                    <p className="font-mono font-semibold tabular-nums">
                      {formatBytes(current.process_heap_used_bytes ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground text-xs">Heap total</p>
                    <p className="font-mono font-semibold tabular-nums">
                      {formatBytes(current.process_heap_total_bytes ?? 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden transition-all duration-300 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Load average
                </CardTitle>
                <CardDescription className="text-xs">1m, 5m, 15m</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-muted-foreground text-xs">1 min</p>
                    <p className="font-mono font-semibold tabular-nums">
                      <AnimatedNumber
                        value={current.load_avg_1m ?? 0}
                        format={(n) => n.toFixed(2)}
                        chaseDuration={400}
                      />
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-muted-foreground text-xs">5 min</p>
                    <p className="font-mono font-semibold tabular-nums">
                      <AnimatedNumber
                        value={current.load_avg_5m ?? 0}
                        format={(n) => n.toFixed(2)}
                        chaseDuration={400}
                      />
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-muted-foreground text-xs">15 min</p>
                    <p className="font-mono font-semibold tabular-nums">
                      <AnimatedNumber
                        value={current.load_avg_15m ?? 0}
                        format={(n) => n.toFixed(2)}
                        chaseDuration={400}
                      />
                    </p>
                  </div>
                </div>
                {current.disk_usage_percent != null && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-muted-foreground text-xs mb-1">Disk (current)</p>
                    <p className="font-mono font-semibold tabular-nums">
                      <AnimatedNumber
                        value={current.disk_usage_percent}
                        format={(n) => `${n.toFixed(1)}%`}
                        chaseDuration={400}
                      />
                    </p>
                    {current.disk_used_bytes != null && current.disk_total_bytes != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(current.disk_used_bytes)} / {formatBytes(current.disk_total_bytes)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden transition-all duration-300 border-border/60 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Storage breakdown
                </CardTitle>
                <CardDescription className="text-xs">System disk, PostgreSQL, S3 / MinIO</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">System disk</p>
                      {current.disk_used_bytes != null && current.disk_total_bytes != null ? (
                        <p className="font-mono font-semibold tabular-nums">
                          {formatBytes(current.disk_used_bytes)} / {formatBytes(current.disk_total_bytes)}
                          {current.disk_usage_percent != null && (
                            <span className="text-muted-foreground font-normal ml-1">({current.disk_usage_percent.toFixed(1)}%)</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">PostgreSQL</p>
                      {current.storage_breakdown?.database_error ? (
                        <p className="text-destructive text-xs">{current.storage_breakdown.database_error}</p>
                      ) : current.storage_breakdown?.database_bytes != null ? (
                        <p className="font-mono font-semibold tabular-nums">{formatBytes(current.storage_breakdown.database_bytes)}</p>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
                    <Cloud className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">S3 / MinIO</p>
                      {current.storage_breakdown?.s3_error ? (
                        <p className="text-destructive text-xs">{current.storage_breakdown.s3_error}</p>
                      ) : current.storage_breakdown?.s3_bytes != null ? (
                        <p className="font-mono font-semibold tabular-nums">{formatBytes(current.storage_breakdown.s3_bytes)}</p>
                      ) : (
                        <p className="text-muted-foreground">Not configured or empty</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <>
              <Card className="overflow-hidden border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PulseIcon className="h-4 w-4" />
                    CPU &amp; memory over time
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {connected ? "Live stream + last 24h history" : "Last 24 hours"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={cpuMemoryChartConfig} className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                        <XAxis
                          dataKey="time"
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
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_, payload) =>
                                payload?.[0]?.payload?.created_at &&
                                new Date(payload[0].payload.created_at).toLocaleString()
                              }
                              formatter={(value: unknown) => [typeof value === "number" ? `${value.toFixed(1)}%` : String(value ?? ""), ""]}
                            />
                          }
                        />
                        <defs>
                          <linearGradient id="monitoringCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_CPU} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={CHART_CPU} stopOpacity={0.08} />
                          </linearGradient>
                          <linearGradient id="monitoringMem" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_MEM} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={CHART_MEM} stopOpacity={0.08} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="process_cpu_usage_percent"
                          name="Process CPU %"
                          fill="url(#monitoringCpu)"
                          fillOpacity={1}
                          stroke={CHART_CPU}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                          isAnimationActive={true}
                          animationDuration={800}
                          animationEasing="ease-out"
                          connectNulls
                        />
                        <Area
                          type="monotone"
                          dataKey="memory_usage_percent"
                          name="Memory %"
                          fill="url(#monitoringMem)"
                          fillOpacity={1}
                          stroke={CHART_MEM}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                          isAnimationActive={true}
                          animationDuration={800}
                          animationEasing="ease-out"
                          connectNulls
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Load average over time</CardTitle>
                  <CardDescription className="text-xs">1m, 5m, 15m</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={loadChartConfig} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                        <XAxis
                          dataKey="time"
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
                          domain={[0, "auto"]}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_, payload) =>
                                payload?.[0]?.payload?.created_at &&
                                new Date(payload[0].payload.created_at).toLocaleString()
                              }
                            />
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="load_avg_1m"
                          stroke={CHART_LOAD1}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                          isAnimationActive={true}
                          animationDuration={800}
                          animationEasing="ease-out"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="load_avg_5m"
                          stroke={CHART_LOAD5}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                          isAnimationActive={true}
                          animationDuration={800}
                          animationEasing="ease-out"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="load_avg_15m"
                          stroke={CHART_LOAD15}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                          isAnimationActive={true}
                          animationDuration={800}
                          animationEasing="ease-out"
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
              {chartData.some((h) => h.disk_usage_percent != null) && (
                <Card className="overflow-hidden border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Disk usage over time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={diskChartConfig} className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                          <XAxis
                            dataKey="time"
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
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value: unknown) => [typeof value === "number" ? `${value.toFixed(1)}%` : String(value ?? ""), ""]}
                                labelFormatter={(_, payload) =>
                                  payload?.[0]?.payload?.created_at &&
                                  new Date(payload[0].payload.created_at).toLocaleString()
                                }
                              />
                            }
                          />
                          <defs>
                            <linearGradient id="monitoringDisk" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CHART_DISK} stopOpacity={0.5} />
                              <stop offset="100%" stopColor={CHART_DISK} stopOpacity={0.08} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="disk_usage_percent"
                            fill="url(#monitoringDisk)"
                            fillOpacity={1}
                            stroke={CHART_DISK}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                            connectNulls
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {!loading && !error && !current && (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
            No metrics yet. Refresh to record the first snapshot.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
