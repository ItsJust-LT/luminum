'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Gauge,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
  Download,
  ChevronDown,
  ListTree,
  AlertCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { useOrganization } from "@/lib/contexts/organization-context"
import type { Website } from "@/lib/types/websites"
import type { AuditDetail, AuditListItem, AuditSummary, MetricStatus } from "@/lib/types/audits"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { cn } from "@/lib/utils"

function fmtAuditDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function gradeBadgeClass(grade?: string) {
  switch (grade) {
    case "A":
      return "border-chart-2/35 bg-chart-2/15 text-chart-2 border"
    case "B":
      return "border-chart-5/35 bg-chart-5/15 text-chart-5 border"
    case "C":
      return "border-chart-3/35 bg-chart-3/15 text-chart-3 border"
    case "D":
      return "border-chart-4/35 bg-chart-4/15 text-chart-4 border"
    default:
      return "border-destructive/35 bg-destructive/10 text-destructive border"
  }
}

function bottleneckBadgeVariant(severity: MetricStatus): "destructive" | "secondary" | "outline" {
  if (severity === "poor") return "destructive"
  if (severity === "needsImprovement") return "outline"
  return "secondary"
}

function exportJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function exportCsv(name: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(",")]
  for (const r of rows) {
    csv.push(headers.map((h) => JSON.stringify(String(r[h] ?? ""))).join(","))
  }
  const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function auditStatusBadgeClass(status: AuditListItem["status"]) {
  switch (status) {
    case "completed":
      return "border-chart-2/35 bg-chart-2/10 text-chart-2 border"
    case "running":
    case "queued":
      return "border-primary/35 bg-primary/10 text-primary border"
    case "failed":
      return "border-destructive/35 bg-destructive/10 text-destructive border"
    default:
      return "border-border bg-muted text-muted-foreground border"
  }
}

export default function AuditsPage() {
  const { organization } = useOrganization()
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("")
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [selectedAuditId, setSelectedAuditId] = useState<string>("")
  const [selectedAudit, setSelectedAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [listRefreshing, setListRefreshing] = useState(false)
  const [running, setRunning] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "failed" | "running">("all")
  const [deviceFilter, setDeviceFilter] = useState<"all" | "mobile" | "desktop">("all")
  const [search, setSearch] = useState("")
  const [websitesLoading, setWebsitesLoading] = useState(true)
  const selectedAuditIdRef = useRef(selectedAuditId)
  selectedAuditIdRef.current = selectedAuditId

  const selectedWebsite = useMemo(
    () => websites.find((w) => w.id === selectedWebsiteId),
    [websites, selectedWebsiteId]
  )

  const loadAudits = useCallback(async (websiteId: string) => {
    const res = (await api.websiteAudits.list({ websiteId, limit: 20 })) as {
      data?: AuditListItem[]
    }
    const rows = res?.data ?? []
    setAudits(rows)
    const prefer = selectedAuditIdRef.current
    const pick = prefer && rows.some((r) => r.id === prefer) ? prefer : rows[0]?.id
    if (pick) {
      setSelectedAuditId(pick)
      const d = (await api.websiteAudits.getById(pick)) as { data?: AuditDetail | null }
      setSelectedAudit(d?.data ?? null)
    } else {
      setSelectedAudit(null)
      setSelectedAuditId("")
    }
  }, [])

  const refreshSelectedAudit = useCallback(async () => {
    if (!selectedAuditId) return
    const d = (await api.websiteAudits.getById(selectedAuditId)) as { data?: AuditDetail | null }
    setSelectedAudit(d?.data ?? null)
  }, [selectedAuditId])

  const handleRefreshList = useCallback(async () => {
    if (!selectedWebsiteId) return
    setListRefreshing(true)
    try {
      await loadAudits(selectedWebsiteId)
      await refreshSelectedAudit()
    } finally {
      setListRefreshing(false)
    }
  }, [selectedWebsiteId, loadAudits, refreshSelectedAudit])

  useEffect(() => {
    if (!organization?.id) return
    setWebsitesLoading(true)
    void (async () => {
      try {
        const w = (await api.websites.list(organization.id)) as { data?: Website[] }
        const list = w?.data ?? []
        setWebsites(list)
        if (list[0]) setSelectedWebsiteId(list[0].id)
      } finally {
        setWebsitesLoading(false)
      }
    })()
  }, [organization?.id])

  useEffect(() => {
    if (!selectedWebsiteId) {
      setAudits([])
      setSelectedAudit(null)
      setSelectedAuditId("")
      return
    }
    setLoading(true)
    setSelectedAudit(null)
    void loadAudits(selectedWebsiteId).finally(() => setLoading(false))
  }, [selectedWebsiteId, loadAudits])

  useEffect(() => {
    const active = selectedAudit?.status === "queued" || selectedAudit?.status === "running"
    if (!active || !selectedWebsiteId) return
    const id = setInterval(() => {
      void loadAudits(selectedWebsiteId)
      void refreshSelectedAudit()
    }, 3000)
    return () => clearInterval(id)
  }, [selectedAudit?.status, selectedWebsiteId, loadAudits, refreshSelectedAudit])

  const runScan = async () => {
    if (!selectedWebsiteId || running) return
    setRunning(true)
    try {
      const r = (await api.websiteAudits.create(selectedWebsiteId)) as { data?: { auditId?: string } }
      const newId = r?.data?.auditId
      await loadAudits(selectedWebsiteId)
      if (newId) {
        setSelectedAuditId(newId)
        const d = (await api.websiteAudits.getById(newId)) as { data?: AuditDetail | null }
        setSelectedAudit(d?.data ?? null)
      }
    } finally {
      setRunning(false)
    }
  }

  const summary = selectedAudit?.summary as
    | (AuditSummary & { pagesDiscovered?: number; runsCompleted?: number; runsFailed?: number })
    | null
    | undefined

  const pageResults = (selectedAudit?.metrics?.pageResults ?? [])
    .filter((r) => deviceFilter === "all" || r.device === deviceFilter)
    .filter(
      (r) =>
        !search ||
        r.path.toLowerCase().includes(search.toLowerCase()) ||
        r.url.toLowerCase().includes(search.toLowerCase())
    )
    .filter((r) => {
      if (statusFilter === "all") return true
      if (statusFilter === "running")
        return selectedAudit?.status === "running" || selectedAudit?.status === "queued"
      return r.status === statusFilter
    })

  const progressPct = selectedAudit?.progressTotal
    ? Math.round(((selectedAudit.progressDone ?? 0) / selectedAudit.progressTotal) * 100)
    : 0

  const csvRows = useMemo(() => {
    return pageResults.map((r) => ({
      path: r.path,
      url: r.url,
      device: r.device,
      status: r.status,
      score: r.summary?.performanceScore ?? "",
      grade: r.summary?.grade ?? "",
      error: r.error ?? "",
    }))
  }, [pageResults])

  const onAuditSelect = (v: string) => {
    const id = v === "__none" ? "" : v
    setSelectedAuditId(id)
    if (!id) {
      setSelectedAudit(null)
      return
    }
    void (async () => {
      const d = (await api.websiteAudits.getById(id)) as { data?: AuditDetail | null }
      setSelectedAudit(d?.data ?? null)
    })()
  }

  return (
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Gauge className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Site audits</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed sm:text-base">
                  Lighthouse-style performance scans per page and device. Pick a run, filter results, and export when
                  you are ready.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Website</span>
              <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select website" />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{w.domain || w.name || w.id}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Audit run</span>
              <Select value={selectedAuditId || "__none"} onValueChange={onAuditSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No runs yet" />
                </SelectTrigger>
                <SelectContent>
                  {!audits.length && <SelectItem value="__none">No runs yet</SelectItem>}
                  {audits.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex flex-col items-start gap-0.5">
                        <span>{fmtAuditDate(a.createdAt)}</span>
                        <span className="text-muted-foreground text-xs capitalize">{a.status}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
              <div className="space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Row status</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="running">In progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Device</span>
                <Select value={deviceFilter} onValueChange={(v) => setDeviceFilter(v as typeof deviceFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All devices</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Search</span>
                <Input
                  className="w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Path or URL…"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={runScan} disabled={!selectedWebsiteId || running} className="min-w-[9rem]">
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
                {running ? "Starting…" : "Run audit"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleRefreshList()}
                disabled={!selectedWebsiteId || listRefreshing}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", listRefreshing && "animate-spin")} />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={!selectedAudit && !csvRows.length}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!selectedAudit}
                    onClick={() => selectedAudit && exportJson(`audit-${selectedAudit.id}.json`, selectedAudit)}
                  >
                    Full report (JSON)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!csvRows.length} onClick={() => exportCsv(`audit-${selectedAuditId || "pages"}.csv`, csvRows)}>
                    Filtered pages (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {!organization?.id && (
        <Card className="app-card">
          <CardContent className="text-muted-foreground py-10 text-center text-sm">Loading organization…</CardContent>
        </Card>
      )}

      {organization?.id && !websitesLoading && !websites.length && !loading && (
        <Card className="app-card">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Globe className="text-muted-foreground h-10 w-10" />
            <p className="text-foreground font-medium">No websites in this organization</p>
            <p className="text-muted-foreground max-w-md text-sm">Add a website first, then you can run audits against it.</p>
          </CardContent>
        </Card>
      )}

      {organization?.id && websitesLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      )}

      {organization?.id && !websitesLoading && loading && websites.length > 0 && (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      )}

      {!websitesLoading && !loading && selectedAudit && (
        <>
          {(selectedAudit.status === "running" || selectedAudit.status === "queued") && (
            <Card className="app-card border-primary/25 bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-2 text-base">
                  <Loader2 className="text-primary h-4 w-4 animate-spin" />
                  Audit in progress
                </CardTitle>
                <CardDescription>{selectedAudit.progressCurrent || "Preparing scan…"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-2 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {selectedAudit.progressDone ?? 0} / {selectedAudit.progressTotal ?? 0} tasks · {progressPct}%
                </p>
              </CardContent>
            </Card>
          )}

          {selectedWebsite && (
            <p className="text-muted-foreground text-sm">
              Viewing audits for{" "}
              <span className="text-foreground font-medium">{selectedWebsite.domain || selectedWebsite.name}</span>
            </p>
          )}

          {summary && (
            <section className="space-y-3">
              <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight">Summary</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Card className="app-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Overall score</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{summary.overallScore}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="app-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Grade</CardDescription>
                    <CardTitle className="text-2xl">
                      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-lg font-semibold", gradeBadgeClass(summary.grade))}>
                        {summary.grade}
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="app-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Pages discovered</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{summary.pagesDiscovered ?? "—"}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="app-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Runs completed</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{summary.runsCompleted ?? 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="app-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Runs failed</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{summary.runsFailed ?? 0}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </section>
          )}

          {summary && (summary.bottlenecks?.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight">
                <ListTree className="h-5 w-5 shrink-0 opacity-80" />
                Priority opportunities
              </h2>
              <Card className="app-card">
                <CardContent className="space-y-3 pt-6">
                  {(summary.bottlenecks ?? []).slice(0, 12).map((b) => (
                    <div key={b.id} className="bg-muted/30 border-border rounded-lg border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="font-medium">{b.title}</div>
                        <Badge variant={bottleneckBadgeVariant(b.severity)} className="w-fit shrink-0 capitalize">
                          {b.severity === "needsImprovement" ? "Needs work" : b.severity}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{b.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-foreground text-lg font-semibold tracking-tight">Page results</h2>
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-base">Per-page runs</CardTitle>
                <CardDescription>Rows appear as each URL and device finishes. Filters apply to this list only.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="md:hidden space-y-3">
                  {pageResults.map((r, idx) => (
                    <Card key={`${r.path}-${r.device}-${idx}`} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 font-mono text-sm">{r.path}</div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {r.device === "mobile" ? (
                              <Smartphone className="text-muted-foreground h-4 w-4" />
                            ) : (
                              <Monitor className="text-muted-foreground h-4 w-4" />
                            )}
                            <Badge
                              variant={r.status === "completed" ? "secondary" : "destructive"}
                              className="text-xs capitalize"
                            >
                              {r.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground mt-1 truncate text-xs">{r.url}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {r.summary ? (
                            <>
                              <Badge className={cn("tabular-nums", gradeBadgeClass(r.summary.grade))}>
                                {r.summary.performanceScore} · {r.summary.grade}
                              </Badge>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">No score yet</span>
                          )}
                        </div>
                        {r.error ? (
                          <div className="text-destructive mt-3 flex gap-2 text-sm">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{r.error}</span>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                  {!pageResults.length && (
                    <p className="text-muted-foreground py-6 text-center text-sm">No rows match the current filters.</p>
                  )}
                </div>

                <div className="hidden md:block">
                  <ScrollArea className="max-h-[min(24rem,55vh)] w-full rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[28%]">Path</TableHead>
                          <TableHead className="w-[32%]">URL</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageResults.map((r, idx) => (
                          <TableRow key={`${r.path}-${r.device}-${idx}`}>
                            <TableCell className="font-mono text-sm">{r.path}</TableCell>
                            <TableCell>
                              <span className="text-muted-foreground line-clamp-2 max-w-[280px] text-xs">{r.url}</span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 capitalize text-sm">
                                {r.device === "mobile" ? (
                                  <Smartphone className="text-muted-foreground h-3.5 w-3.5" />
                                ) : (
                                  <Monitor className="text-muted-foreground h-3.5 w-3.5" />
                                )}
                                {r.device}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.status === "completed" ? "secondary" : "destructive"} className="capitalize">
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.summary?.performanceScore ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.summary?.grade ? (
                                <Badge className={cn("tabular-nums", gradeBadgeClass(r.summary.grade))}>{r.summary.grade}</Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {!pageResults.length && (
                    <p className="text-muted-foreground py-6 text-center text-sm">No rows match the current filters.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {!websitesLoading &&
        !loading &&
        !selectedAudit &&
        selectedWebsiteId &&
        websites.length > 0 && (
        <Card className="app-card">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Gauge className="text-muted-foreground h-10 w-10" />
            <p className="text-foreground font-medium">No audit runs yet</p>
            <p className="text-muted-foreground max-w-md text-sm">
              Run an audit to scan your site. Progress and per-page scores will show up here as the job finishes.
            </p>
            <Button className="mt-2" onClick={runScan} disabled={running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
              Run first audit
            </Button>
          </CardContent>
        </Card>
      )}

      {!websitesLoading && !loading && audits.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">Run history</h2>
          <Card className="app-card">
            <CardContent className="p-0">
              <ScrollArea className="max-h-[min(20rem,40vh)] w-full sm:max-h-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Trigger</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => {
                      const g = (a.summary as AuditSummary | null)?.grade
                      const score = (a.summary as AuditSummary | null)?.performanceScore
                      return (
                        <TableRow key={a.id} className={cn(a.id === selectedAuditId && "bg-muted/40")}>
                          <TableCell className="whitespace-nowrap text-sm">{fmtAuditDate(a.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("capitalize", auditStatusBadgeClass(a.status))}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden max-w-[140px] truncate text-sm sm:table-cell">
                            {a.triggerSource || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {score != null && g ? (
                              <Badge className={cn("tabular-nums", gradeBadgeClass(g))}>
                                {score} · {g}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                onClick={async () => {
                                  setSelectedAuditId(a.id)
                                  const d = (await api.websiteAudits.getById(a.id)) as { data?: AuditDetail | null }
                                  setSelectedAudit(d?.data ?? null)
                                }}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Retry audit"
                                onClick={async () => {
                                  await api.websiteAudits.retry(a.id)
                                  if (selectedWebsiteId) await loadAudits(selectedWebsiteId)
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>
      )}
    </AppPageContainer>
  )
}
