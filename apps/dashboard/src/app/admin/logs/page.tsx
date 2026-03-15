"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Info, Bug, AlertTriangle, Wifi } from "lucide-react"
import { getSystemLogs } from "@/lib/actions/admin-actions"
import { useRealtime } from "@/components/realtime/realtime-provider"

const LEVEL_OPTIONS = ["", "info", "warn", "error", "debug"]
const SERVICE_OPTIONS = ["", "api", "dashboard", "analytics"]

interface LogItem {
  id: string
  created_at: string
  service: string
  level: string
  message: string
  meta?: Record<string, unknown> | null
  request_id?: string | null
}

function matchesFilters(log: LogItem, service: string, level: string): boolean {
  if (service && log.service !== service) return false
  if (level && log.level !== level) return false
  return true
}

export default function AdminLogsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<LogItem[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [service, setService] = useState("")
  const [level, setLevel] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const filtersRef = useRef({ service, level })
  filtersRef.current = { service, level }

  const { connected, onMessage } = useRealtime()

  const fetchLogs = useCallback(async (page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSystemLogs({
        page,
        limit: 50,
        service: service || undefined,
        level: level || undefined,
      }) as any
      if (result?.success) {
        setItems(result.items ?? [])
        setPagination(result.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 })
      } else {
        setError(result?.error || "Failed to load logs")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load logs")
    } finally {
      setLoading(false)
    }
  }, [service, level])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  useEffect(() => {
    const unsub = onMessage("log:new", (data: LogItem) => {
      if (!data?.id) return
      const { service: s, level: l } = filtersRef.current
      if (!matchesFilters(data as LogItem, s, l)) return
      setItems((prev) => {
        if (prev.some((log) => log.id === data.id)) return prev
        return [data as LogItem, ...prev]
      })
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }))
    })
    return unsub
  }, [onMessage])

  const levelIcon = (l: string) => {
    switch (l) {
      case "error": return <AlertCircle className="h-4 w-4 text-destructive" />
      case "warn": return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "debug": return <Bug className="h-4 w-4 text-muted-foreground" />
      default: return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  const levelBadgeClass = (l: string) => {
    switch (l) {
      case "error": return "bg-destructive/15 text-destructive border-destructive/30"
      case "warn": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
      case "debug": return "bg-muted text-muted-foreground border-border"
      default: return "bg-primary/10 text-primary border-primary/30"
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Logs</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Request, error, and application logs from API, dashboard, and analytics.
            {connected ? (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Wifi className="h-3.5 w-3.5" /> Live
              </span>
            ) : (
              <span className="text-muted-foreground/80">Reconnect for live stream</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(pagination.page)} disabled={loading} className="gap-2">
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base">Logs</CardTitle>
            <Select value={service || "all"} onValueChange={(v) => setService(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map((s) => (
                  <SelectItem key={s || "all"} value={s || "all"}>{s || "All services"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={level || "all"} onValueChange={(v) => setLevel(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l || "all"} value={l || "all"}>{l || "All levels"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading && items.length === 0 ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No logs match the filters.</div>
            ) : (
              <div className="divide-y">
                {items.map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className="flex flex-col sm:flex-row sm:items-start gap-2 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${levelBadgeClass(log.level)}`}>
                          {levelIcon(log.level)}
                          {log.level}
                        </span>
                        <span className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-medium">{log.service}</span>
                      </div>
                      <p className="text-sm text-foreground break-words flex-1 min-w-0">{log.message}</p>
                    </div>
                    {expandedId === log.id && (log.meta || log.request_id) && (
                      <div className="mt-2 pl-2 border-l-2 border-muted text-xs font-mono bg-muted/30 rounded-r p-2 overflow-x-auto">
                        {log.request_id && <div><span className="text-muted-foreground">request_id:</span> {log.request_id}</div>}
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <pre className="whitespace-pre-wrap break-all mt-1">{JSON.stringify(log.meta, null, 2)}</pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
