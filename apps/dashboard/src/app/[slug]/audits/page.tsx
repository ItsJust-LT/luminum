'use client'

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Gauge, Globe, Smartphone, Monitor, RefreshCw, AlertTriangle, Download } from "lucide-react"
import { api } from "@/lib/api"
import { useOrganization } from "@/lib/contexts/organization-context"
import type { Website } from "@/lib/types/websites"
import type { AuditDetail, AuditListItem, AuditSummary } from "@/lib/types/audits"

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString()
}

function gradeColor(grade?: string) {
  if (grade === "A") return "bg-emerald-500/15 text-emerald-600"
  if (grade === "B") return "bg-green-500/15 text-green-600"
  if (grade === "C") return "bg-yellow-500/15 text-yellow-700"
  if (grade === "D") return "bg-orange-500/15 text-orange-700"
  return "bg-red-500/15 text-red-700"
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

export default function AuditsPage() {
  const { organization } = useOrganization()
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("")
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [selectedAuditId, setSelectedAuditId] = useState<string>("")
  const [selectedAudit, setSelectedAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "failed" | "running">("all")
  const [deviceFilter, setDeviceFilter] = useState<"all" | "mobile" | "desktop">("all")
  const [search, setSearch] = useState("")

  const loadAudits = useCallback(async (websiteId: string) => {
    const res = await api.websiteAudits.list({ websiteId, limit: 20 }) as any
    const rows = (res?.data ?? []) as AuditListItem[]
    setAudits(rows)
    const pick = selectedAuditId && rows.find((r) => r.id === selectedAuditId) ? selectedAuditId : rows[0]?.id
    if (pick) {
      setSelectedAuditId(pick)
      const d = await api.websiteAudits.getById(pick) as any
      setSelectedAudit(d?.data ?? null)
    } else {
      setSelectedAudit(null)
      setSelectedAuditId("")
    }
  }, [selectedAuditId])

  const refreshSelectedAudit = useCallback(async () => {
    if (!selectedAuditId) return
    const d = await api.websiteAudits.getById(selectedAuditId) as any
    setSelectedAudit(d?.data ?? null)
  }, [selectedAuditId])

  useEffect(() => {
    if (!organization?.id) return
    ;(async () => {
      const w = await api.websites.list(organization.id) as any
      const list = (w?.data ?? []) as Website[]
      setWebsites(list)
      if (list[0]) setSelectedWebsiteId(list[0].id)
    })().catch(() => {})
  }, [organization?.id])

  useEffect(() => {
    if (!selectedWebsiteId) return
    setLoading(true)
    loadAudits(selectedWebsiteId).finally(() => setLoading(false))
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
      const r = await api.websiteAudits.create(selectedWebsiteId) as any
      const newId = r?.data?.auditId as string | undefined
      await loadAudits(selectedWebsiteId)
      if (newId) {
        setSelectedAuditId(newId)
        const d = await api.websiteAudits.getById(newId) as any
        setSelectedAudit(d?.data ?? null)
      }
    } finally {
      setRunning(false)
    }
  }

  const summary = selectedAudit?.summary as (AuditSummary & { pagesDiscovered?: number; runsCompleted?: number; runsFailed?: number }) | null
  const pageResults = (selectedAudit?.metrics?.pageResults ?? [])
    .filter((r) => deviceFilter === "all" || r.device === deviceFilter)
    .filter((r) => !search || r.path.toLowerCase().includes(search.toLowerCase()) || r.url.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => {
      if (statusFilter === "all") return true
      if (statusFilter === "running") return selectedAudit?.status === "running" || selectedAudit?.status === "queued"
      return r.status === statusFilter
    })

  const progressPct = selectedAudit?.progressTotal ? Math.round(((selectedAudit.progressDone ?? 0) / selectedAudit.progressTotal) * 100) : 0

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

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Website" /></SelectTrigger>
            <SelectContent>{websites.map((w) => <SelectItem key={w.id} value={w.id}><Globe className="inline h-3 w-3 mr-1" />{w.domain}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedAuditId || "__none"} onValueChange={(v) => {
            const id = v === "__none" ? "" : v
            setSelectedAuditId(id)
            if (!id) return
            void (async () => {
              const d = await api.websiteAudits.getById(id) as any
              setSelectedAudit(d?.data ?? null)
            })()
          }}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Audit run" /></SelectTrigger>
            <SelectContent>
              {!audits.length && <SelectItem value="__none">No runs</SelectItem>}
              {audits.map((a) => <SelectItem key={a.id} value={a.id}>{fmtDate(a.createdAt)} • {a.status}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">In progress</SelectItem>
            </SelectContent>
          </Select>
          <Select value={deviceFilter} onValueChange={(v: any) => setDeviceFilter(v)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All devices</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
            </SelectContent>
          </Select>
          <Input className="w-[220px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter page path/url" />
          <Button onClick={runScan} disabled={!selectedWebsiteId || running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
            {running ? "Starting..." : "Run full audit"}
          </Button>
          <Button variant="outline" onClick={() => selectedAudit && exportJson(`audit-${selectedAudit.id}.json`, selectedAudit)} disabled={!selectedAudit}>
            <Download className="mr-2 h-4 w-4" />Export JSON
          </Button>
          <Button variant="outline" onClick={() => exportCsv(`audit-${selectedAuditId || "pages"}.csv`, csvRows)} disabled={!csvRows.length}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Enterprise Growth Audit Report</h1>
        <p className="text-muted-foreground">Realtime full-site auditing with progressive insights and executive-ready exports.</p>
      </div>

      {loading && <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>}

      {!loading && selectedAudit && (
        <>
          {(selectedAudit.status === "running" || selectedAudit.status === "queued") && (
            <Card className="border-blue-300 bg-blue-50/60">
              <CardHeader>
                <CardTitle className="text-blue-800">Realtime Audit Progress</CardTitle>
                <CardDescription>{selectedAudit.progressCurrent || "Preparing scan..."}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-2 w-full overflow-hidden rounded bg-blue-200">
                  <div className="h-2 bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="mt-2 text-sm text-blue-800">{selectedAudit.progressDone ?? 0} / {selectedAudit.progressTotal ?? 0} tasks • {progressPct}%</div>
              </CardContent>
            </Card>
          )}

          {summary && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Executive KPIs</h2>
              <div className="grid gap-4 md:grid-cols-5">
                <Card><CardHeader><CardDescription>Overall Score</CardDescription><CardTitle>{summary.overallScore}</CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription>Grade</CardDescription><CardTitle><Badge className={gradeColor(summary.grade)}>{summary.grade}</Badge></CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription>Pages Discovered</CardDescription><CardTitle>{summary.pagesDiscovered ?? "-"}</CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription>Runs Completed</CardDescription><CardTitle>{summary.runsCompleted ?? 0}</CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription>Runs Failed</CardDescription><CardTitle>{summary.runsFailed ?? 0}</CardTitle></CardHeader></Card>
              </div>
            </section>
          )}

          {summary && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Priority Growth Opportunities</h2>
              <Card>
                <CardContent className="space-y-3 pt-6">
                  {(summary.bottlenecks ?? []).slice(0, 10).map((b) => (
                    <div key={b.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{b.title}</div>
                        <Badge variant={b.severity === "poor" ? "destructive" : "secondary"}>{b.severity}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{b.description}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Per-Page Realtime Results</h2>
            <Card>
              <CardHeader>
                <CardTitle>Page / Device Execution</CardTitle>
                <CardDescription>Rows stream in as each page/device run completes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pageResults.map((r, idx) => (
                  <div key={`${r.path}-${r.device}-${idx}`} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-mono text-sm">{r.path}</div>
                        <div className="text-xs text-muted-foreground">{r.url}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.device === "mobile" ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                        <Badge variant={r.status === "completed" ? "secondary" : "destructive"}>{r.status}</Badge>
                        {r.summary && <Badge className={gradeColor(r.summary.grade)}>{r.summary.performanceScore}</Badge>}
                      </div>
                    </div>
                    {r.error && <div className="mt-2 text-sm text-destructive">{r.error}</div>}
                  </div>
                ))}
                {!pageResults.length && <div className="text-sm text-muted-foreground">No page rows match current filters yet.</div>}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {!loading && !selectedAudit && (
        <Card>
          <CardContent className="py-12 text-center">
            <Gauge className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">No audits yet</div>
            <div className="text-sm text-muted-foreground">Run a full audit to generate an enterprise report.</div>
          </CardContent>
        </Card>
      )}

      {!loading && audits.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Audit Run History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {audits.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{fmtDate(a.createdAt)}</div>
                  <div className="text-xs text-muted-foreground">{a.status} • {a.triggerSource}</div>
                </div>
                <div className="flex items-center gap-2">
                  {a.summary && <Badge className={gradeColor((a.summary as any)?.grade)}>{(a.summary as any)?.performanceScore}</Badge>}
                  <Button variant="ghost" size="sm" onClick={async () => {
                    setSelectedAuditId(a.id)
                    const d = await api.websiteAudits.getById(a.id) as any
                    setSelectedAudit(d?.data ?? null)
                  }}>View</Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await api.websiteAudits.retry(a.id)
                    if (selectedWebsiteId) await loadAudits(selectedWebsiteId)
                  }}><RefreshCw className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
