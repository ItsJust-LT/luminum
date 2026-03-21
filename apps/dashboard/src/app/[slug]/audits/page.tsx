'use client'

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Bar, BarChart, Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  Gauge, RefreshCw, Globe, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, Monitor, Smartphone, Zap, Loader2,
} from "lucide-react"
import { api } from "@/lib/api"
import { useOrganization } from "@/lib/contexts/organization-context"
import type { Website } from "@/lib/types/websites"
import type { AuditListItem, AuditDetail, AuditSummary, Grade, MetricStatus } from "@/lib/types/audits"
const GRADE_COLORS: Record<Grade, string> = {
  A: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  B: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/40",
  C: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40",
  D: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/40",
  F: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
}

const STATUS_COLORS: Record<MetricStatus, string> = {
  good: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  needsImprovement: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40",
  poor: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
}

const STATUS_LABELS: Record<MetricStatus, string> = {
  good: "Good",
  needsImprovement: "Needs Improvement",
  poor: "Poor",
}

function scoreToRingColor(score: number) {
  if (score >= 90) return "stroke-emerald-500"
  if (score >= 75) return "stroke-green-500"
  if (score >= 60) return "stroke-yellow-500"
  if (score >= 40) return "stroke-orange-500"
  return "stroke-red-500"
}

function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={8}
          className="stroke-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={8}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className={`${scoreToRingColor(score)} transition-all duration-700`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes > 1_000) return `${(bytes / 1_000).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

const trendChartConfig: ChartConfig = {
  score: { label: "Performance", color: "#3b82f6" },
}

const resourceChartConfig: ChartConfig = {
  js: { label: "JavaScript", color: "#f59e0b" },
  css: { label: "CSS", color: "#3b82f6" },
  images: { label: "Images", color: "#10b981" },
  fonts: { label: "Fonts", color: "#8b5cf6" },
  other: { label: "Other", color: "#6b7280" },
}

export default function AuditsPage() {
  const { organization, loading: orgLoading } = useOrganization()

  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [latestDetail, setLatestDetail] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [formFactor, setFormFactor] = useState<"mobile" | "desktop">("mobile")
  const [scanPath, setScanPath] = useState("/")

  const syncAuditsFromServer = useCallback(async (websiteId: string) => {
    const res = await api.websiteAudits.list({ websiteId, limit: 20 }) as any
    const rows: AuditListItem[] = res?.data ?? []
    setAudits(rows)
    const completed = rows.find((a) => a.status === "completed")
    if (completed) {
      const detail = await api.websiteAudits.getById(completed.id) as any
      setLatestDetail(detail?.data ?? null)
    } else {
      setLatestDetail(null)
    }
  }, [])

  const fetchWebsites = useCallback(async () => {
    if (!organization?.id) return
    try {
      const res = await api.websites.list(organization.id) as { data?: Website[] }
      const list = res?.data ?? []
      setWebsites(list)
      setSelectedWebsite((prev) => {
        if (prev && list.some((w) => w.id === prev.id)) return prev
        return list[0] ?? null
      })
    } catch { /* ignore */ }
  }, [organization?.id])

  const silentRefresh = useCallback(async (websiteId: string) => {
    try {
      await syncAuditsFromServer(websiteId)
    } catch { /* ignore */ }
  }, [syncAuditsFromServer])

  const loadAuditsWithBootstrap = useCallback(async (websiteId: string) => {
    setLoading(true)
    try {
      await syncAuditsFromServer(websiteId)
      const boot = await api.websiteAudits.bootstrap(websiteId) as {
        data?: { triggered?: boolean }
      }
      if (boot?.data?.triggered) {
        await syncAuditsFromServer(websiteId)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [syncAuditsFromServer])

  useEffect(() => {
    void fetchWebsites()
  }, [fetchWebsites])

  useEffect(() => {
    if (!selectedWebsite?.id) return
    void loadAuditsWithBootstrap(selectedWebsite.id)
  }, [selectedWebsite?.id, loadAuditsWithBootstrap])

  // Poll while a scan is in progress (no full-page loading)
  useEffect(() => {
    const hasActive = audits.some((a) => a.status === "queued" || a.status === "running")
    if (!hasActive || !selectedWebsite?.id) return
    const id = selectedWebsite.id
    const interval = setInterval(() => {
      void silentRefresh(id)
    }, 5000)
    return () => clearInterval(interval)
  }, [audits, selectedWebsite?.id, silentRefresh])

  const startScan = async () => {
    if (!selectedWebsite || scanning) return
    setScanning(true)
    try {
      await api.websiteAudits.create(selectedWebsite.id, { path: scanPath, formFactor })
      await syncAuditsFromServer(selectedWebsite.id)
    } catch (err: any) {
      console.error("Scan failed:", err.message)
    }
    setScanning(false)
  }

  const summary = latestDetail?.summary as AuditSummary | null
  const metrics = latestDetail?.metrics as AuditDetail["metrics"] | null

  const trendData = audits
    .filter((a) => a.status === "completed" && a.summary)
    .reverse()
    .map((a) => ({
      date: formatDate(a.completedAt!),
      score: (a.summary as AuditSummary).performanceScore,
    }))

  const resourceData = metrics?.resources ? [
    { name: "JS", value: metrics.resources.jsBytes, fill: "#f59e0b" },
    { name: "CSS", value: metrics.resources.cssBytes, fill: "#3b82f6" },
    { name: "Images", value: metrics.resources.imageBytes, fill: "#10b981" },
    { name: "Fonts", value: metrics.resources.fontBytes, fill: "#8b5cf6" },
    { name: "Other", value: metrics.resources.otherBytes, fill: "#6b7280" },
  ].filter((r) => r.value > 0) : []

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!organization) return null

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Site Audits</h1>
            <p className="text-muted-foreground">
              Performance insights powered by Lighthouse. If a site has no results yet, we start a mobile homepage scan automatically.
              Daily scheduled scans also run once per site per UTC day when your worker and Redis are configured.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {websites.length > 1 && (
              <Select
                value={selectedWebsite?.id ?? ""}
                onValueChange={(v) => setSelectedWebsite(websites.find((w) => w.id === v) ?? null)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select website" />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <Globe className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                      {w.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              className="w-[100px] h-9 text-sm"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value || "/")}
              placeholder="Path"
              title="URL path to scan (e.g. / or /pricing)"
            />
            <Select value={formFactor} onValueChange={(v) => setFormFactor(v as "mobile" | "desktop")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">
                  <Smartphone className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />Mobile
                </SelectItem>
                <SelectItem value="desktop">
                  <Monitor className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />Desktop
                </SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button onClick={startScan} disabled={scanning || !selectedWebsite}>
                    {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gauge className="h-4 w-4 mr-2" />}
                    {scanning ? "Scanning..." : "Run manual scan"}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Enqueues a new Lighthouse run immediately. Subject to per-user rate limits. First-time sites are auto-scanned when you open this page.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* No website state */}
        {websites.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No websites configured</h3>
              <p className="text-muted-foreground mb-4">Add a website in your organization settings to start running audits.</p>
            </CardContent>
          </Card>
        )}

        {/* Active scan banner */}
        {audits.some((a) => a.status === "queued" || a.status === "running") && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="py-3 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Audit in progress — results will appear automatically
              </span>
            </CardContent>
          </Card>
        )}

        {/* Overview cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 flex items-center gap-6">
                <ScoreRing score={summary.overallScore} label="Overall" />
                <div>
                  <Badge className={`text-lg px-3 py-1 ${GRADE_COLORS[summary.grade]}`}>
                    {summary.grade}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Scoring v{summary.scoringVersion}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <ScoreRing score={summary.performanceScore} size={96} label="Performance" />
                <p className="text-sm text-muted-foreground mt-2 text-center">Lighthouse Performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Top Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.bottlenecks.length === 0 ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    No major issues detected
                  </p>
                ) : (
                  summary.bottlenecks.slice(0, 4).map((b) => (
                    <Tooltip key={b.id}>
                      <TooltipTrigger asChild>
                        <div className="flex items-start gap-2 text-sm cursor-default">
                          <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${b.severity === "poor" ? "bg-red-500" : "bg-yellow-500"}`} />
                          <span className="line-clamp-1">{b.title}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p>{b.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Core Web Vitals + Timings */}
        {metrics && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Core Web Vitals</CardTitle>
                <CardDescription>Key user experience metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.cwv.map((m) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm font-medium cursor-default">{m.name}</span>
                      </TooltipTrigger>
                      <TooltipContent><p>{m.label}</p></TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{m.displayValue}</span>
                      <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[m.status]}`}>
                        {STATUS_LABELS[m.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Timings</CardTitle>
                <CardDescription>Page load milestones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.timings.map((m) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm font-medium cursor-default">{m.name}</span>
                      </TooltipTrigger>
                      <TooltipContent><p>{m.label}</p></TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{m.displayValue}</span>
                      <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[m.status]}`}>
                        {STATUS_LABELS[m.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts row */}
        {(trendData.length > 1 || resourceData.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {trendData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Trend</CardTitle>
                  <CardDescription>Score over recent audits</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={trendChartConfig} className="h-[220px] w-full">
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {resourceData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resource Breakdown</CardTitle>
                  <CardDescription>
                    {metrics?.resources ? `${formatBytes(metrics.resources.totalBytes)} total · ${metrics.resources.totalRequests} requests` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={resourceChartConfig} className="h-[220px] w-full">
                    <BarChart data={resourceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis type="number" tickFormatter={(v) => formatBytes(v)} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} />
                      <ChartTooltip
                        content={({ payload }) => {
                          if (!payload?.[0]) return null
                          const d = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
                              <p className="font-medium">{d.name}</p>
                              <p className="text-muted-foreground">{formatBytes(d.value)}</p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {resourceData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bottlenecks detail */}
        {summary && summary.bottlenecks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Detected Bottlenecks
              </CardTitle>
              <CardDescription>Issues that may be slowing down your site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {summary.bottlenecks.map((b) => (
                  <div key={b.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${b.severity === "poor" ? "bg-red-500" : "bg-yellow-500"}`} />
                    <div>
                      <p className="text-sm font-medium">{b.title}</p>
                      <p className="text-sm text-muted-foreground">{b.description}</p>
                    </div>
                    <Badge variant="secondary" className={`ml-auto shrink-0 text-xs ${STATUS_COLORS[b.severity]}`}>
                      {STATUS_LABELS[b.severity]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit history */}
        {audits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Audit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {audits.map((a) => {
                  const s = a.summary as AuditSummary | null
                  return (
                    <div key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.targetUrl}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(a.createdAt)} · {a.formFactor}
                        </p>
                      </div>
                      {a.status === "completed" && s && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{s.performanceScore}</span>
                          <Badge className={`text-xs ${GRADE_COLORS[s.grade]}`}>{s.grade}</Badge>
                        </div>
                      )}
                      {a.status === "failed" && (
                        <Badge variant="destructive" className="text-xs">Failed</Badge>
                      )}
                      {(a.status === "queued" || a.status === "running") && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {a.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const detail = await api.websiteAudits.getById(a.id) as any
                            setLatestDetail(detail?.data ?? null)
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {a.status === "failed" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await api.websiteAudits.retry(a.id)
                                if (selectedWebsite) void syncAuditsFromServer(selectedWebsite.id)
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Retry scan</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {selectedWebsite && audits.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Gauge className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audits yet</h3>
              <p className="text-muted-foreground mb-4">
                Run your first performance scan for <span className="font-medium">{selectedWebsite.domain}</span>
              </p>
              <Button onClick={startScan} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gauge className="h-4 w-4 mr-2" />}
                Run First Scan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
