'use client'

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Gauge, Globe, Smartphone, Monitor, RefreshCw, AlertTriangle, Trophy } from "lucide-react"
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

export default function AuditsPage() {
  const { organization } = useOrganization()
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("")
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [selectedAudit, setSelectedAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const selectedWebsite = useMemo(
    () => websites.find((w) => w.id === selectedWebsiteId) ?? null,
    [websites, selectedWebsiteId],
  )

  const loadAudits = useCallback(async (websiteId: string) => {
    const res = await api.websiteAudits.list({ websiteId, limit: 20 }) as any
    const rows = (res?.data ?? []) as AuditListItem[]
    setAudits(rows)
    const first = rows[0]
    if (first) {
      const d = await api.websiteAudits.getById(first.id) as any
      setSelectedAudit(d?.data ?? null)
    } else {
      setSelectedAudit(null)
    }
  }, [])

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
    if (!selectedWebsiteId) return
    const active = audits.some((a) => a.status === "queued" || a.status === "running")
    if (!active) return
    const id = setInterval(() => void loadAudits(selectedWebsiteId), 5000)
    return () => clearInterval(id)
  }, [audits, selectedWebsiteId, loadAudits])

  const runScan = async () => {
    if (!selectedWebsiteId || running) return
    setRunning(true)
    try {
      await api.websiteAudits.create(selectedWebsiteId)
      await loadAudits(selectedWebsiteId)
    } finally {
      setRunning(false)
    }
  }

  const pageResults = selectedAudit?.metrics?.pageResults ?? []
  const summary = selectedAudit?.summary as (AuditSummary & { pagesDiscovered?: number; runsCompleted?: number; runsFailed?: number }) | null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Website Growth Audit</h1>
          <p className="text-muted-foreground">
            One professional audit run covers all discovered pages with both mobile and desktop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select website" /></SelectTrigger>
            <SelectContent>
              {websites.map((w) => <SelectItem key={w.id} value={w.id}><Globe className="inline h-3 w-3 mr-1" />{w.domain}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={runScan} disabled={!selectedWebsiteId || running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
            {running ? "Running..." : "Run full audit"}
          </Button>
        </div>
      </div>

      {loading && <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>}

      {!loading && selectedAudit && summary && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader><CardDescription>Overall Score</CardDescription><CardTitle>{summary.overallScore}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Grade</CardDescription><CardTitle><Badge className={gradeColor(summary.grade)}>{summary.grade}</Badge></CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Pages Discovered</CardDescription><CardTitle>{summary.pagesDiscovered ?? "-"}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Runs</CardDescription><CardTitle>{summary.runsCompleted ?? 0} completed / {summary.runsFailed ?? 0} failed</CardTitle></CardHeader></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Top Growth Bottlenecks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary.bottlenecks ?? []).slice(0, 8).map((b) => (
                <div key={b.id} className="rounded-md border p-3">
                  <div className="font-medium">{b.title}</div>
                  <div className="text-sm text-muted-foreground">{b.description}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4" />Top / Worst Page-Device Results</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium">Top performers</div>
                <div className="space-y-2">
                  {(selectedAudit.metrics?.topPages ?? []).slice(0, 8).map((p, i) => (
                    <div key={`t-${i}`} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span className="truncate font-mono">{p.path}</span>
                      <span className="ml-2 flex items-center gap-2">{p.device === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Worst performers</div>
                <div className="space-y-2">
                  {(selectedAudit.metrics?.worstPages ?? []).slice(0, 8).map((p, i) => (
                    <div key={`w-${i}`} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span className="truncate font-mono">{p.path}</span>
                      <span className="ml-2 flex items-center gap-2">{p.device === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Per-page details (mobile + desktop)</CardTitle>
              <CardDescription>Highly detailed results for optimization, UX, and conversion growth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pageResults.map((r, idx) => (
                <div key={`${r.path}-${r.device}-${idx}`} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-sm">{r.path} <span className="text-muted-foreground">({r.url})</span></div>
                    <div className="flex items-center gap-2 text-xs">
                      {r.device === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                      <Badge variant={r.status === "completed" ? "secondary" : "destructive"}>{r.status}</Badge>
                      {r.summary && <Badge className={gradeColor(r.summary.grade)}>{r.summary.performanceScore}</Badge>}
                    </div>
                  </div>
                  {r.error && <div className="mt-2 text-sm text-destructive">{r.error}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && audits.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Audit Runs</CardTitle></CardHeader>
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
                    const d = await api.websiteAudits.getById(a.id) as any
                    setSelectedAudit(d?.data ?? null)
                  }}>View</Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await api.websiteAudits.retry(a.id)
                    if (selectedWebsite) await loadAudits(selectedWebsite.id)
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
