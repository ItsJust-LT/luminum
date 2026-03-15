"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Server, Cpu, HardDrive, MemoryStick, Activity, Clock } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts"
import { getServerMetrics } from "@/lib/actions/admin-actions"

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

interface MetricPoint {
  created_at: string
  time: string
  cpu_usage_percent?: number | null
  memory_usage_percent?: number | null
  load_avg_1m?: number | null
  process_rss_bytes?: number | null
  disk_usage_percent?: number | null
}

export default function AdminMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    success: boolean
    current?: any
    history?: any[]
  } | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getServerMetrics() as any
      if (result?.success) {
        setData(result)
      } else {
        setError(result?.error || "Failed to load metrics")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const t = setInterval(fetchMetrics, 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const current = data?.current
  const history: MetricPoint[] = (data?.history ?? []).map((h: any) => ({
    ...h,
    time: new Date(h.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  }))

  if (loading && !data) {
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
          <h1 className="text-2xl font-bold text-foreground">Server Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            API server resources and metrics (last 24h). Data is recorded when you load or refresh this page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Host</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold truncate" title={current.hostname}>{current.hostname}</p>
                <p className="text-xs text-muted-foreground">{current.platform} · Node {current.node_version}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{formatUptime(current.process_uptime_seconds ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Process · System: {formatUptime(current.system_uptime_seconds ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">
                  {current.cpu_usage_percent != null ? `${current.cpu_usage_percent.toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{current.cpu_cores} cores</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{current.memory_usage_percent?.toFixed(1) ?? "—"}%</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(current.memory_used_bytes ?? 0)} / {formatBytes(current.memory_total_bytes ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Process memory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">RSS</p>
                    <p className="font-mono font-medium">{formatBytes(current.process_rss_bytes ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Heap used</p>
                    <p className="font-mono font-medium">{formatBytes(current.process_heap_used_bytes ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Heap total</p>
                    <p className="font-mono font-medium">{formatBytes(current.process_heap_total_bytes ?? 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Load average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">1 min</p>
                    <p className="font-mono font-medium">{(current.load_avg_1m ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">5 min</p>
                    <p className="font-mono font-medium">{(current.load_avg_5m ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">15 min</p>
                    <p className="font-mono font-medium">{(current.load_avg_15m ?? 0).toFixed(2)}</p>
                  </div>
                </div>
                {current.disk_usage_percent != null && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-muted-foreground text-xs">Disk (current)</p>
                    <p className="font-mono font-medium">{current.disk_usage_percent.toFixed(1)}%</p>
                    {current.disk_used_bytes != null && current.disk_total_bytes != null && (
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(current.disk_used_bytes)} / {formatBytes(current.disk_total_bytes)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {history.length > 0 && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">CPU &amp; memory over time</CardTitle>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                        <Tooltip
                          formatter={(value: number) => [`${value?.toFixed(1) ?? ""}%`, ""]}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.created_at && new Date(payload[0].payload.created_at).toLocaleString()}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="cpu_usage_percent" name="CPU %" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="memory_usage_percent" name="Memory %" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Load average over time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.created_at && new Date(payload[0].payload.created_at).toLocaleString()} />
                        <Legend />
                        <Line type="monotone" dataKey="load_avg_1m" name="Load 1m" stroke="hsl(var(--chart-1))" dot={false} />
                        <Line type="monotone" dataKey="load_avg_5m" name="Load 5m" stroke="hsl(var(--chart-2))" dot={false} />
                        <Line type="monotone" dataKey="load_avg_15m" name="Load 15m" stroke="hsl(var(--chart-3))" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              {history.some((h) => h.disk_usage_percent != null) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Disk usage over time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                          <Tooltip formatter={(value: number) => [`${value?.toFixed(1) ?? ""}%`, ""]} />
                          <Line type="monotone" dataKey="disk_usage_percent" name="Disk %" stroke="hsl(var(--chart-4))" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
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
