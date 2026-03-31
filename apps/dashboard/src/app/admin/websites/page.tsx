"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Globe,
  RefreshCw,
  AlertCircle,
  Filter,
  Search,
  Building2,
  BarChart3,
  ExternalLink,
  Gauge,
  Loader2,
} from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"
import { api } from "@/lib/api"

export default function AdminWebsitesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [websites, setWebsites] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [analyticsFilter, setAnalyticsFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [offset, setOffset] = useState(0)
  const [auditRunningId, setAuditRunningId] = useState<string | null>(null)
  const [analyticsBusyId, setAnalyticsBusyId] = useState<string | null>(null)
  const limit = 25

  const setWebsiteAnalytics = async (websiteId: string, enabled: boolean) => {
    setAnalyticsBusyId(websiteId)
    setError(null)
    try {
      const res = (await api.admin.setAdminWebsiteAnalytics(websiteId, enabled)) as {
        success?: boolean
        error?: string
        website?: { analytics?: boolean }
      }
      if (!res?.success) {
        setError(res?.error || "Failed to update website analytics")
        return
      }
      setWebsites((prev) =>
        prev.map((w) =>
          w.id === websiteId ? { ...w, analytics: res.website?.analytics ?? enabled } : w
        )
      )
      try {
        const statsRes = (await api.admin.getAdminWebsiteStats()) as { success?: boolean; stats?: Record<string, number> }
        if (statsRes.success && statsRes.stats) setStats(statsRes.stats)
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      setError(err.message || "Failed to update website analytics")
    } finally {
      setAnalyticsBusyId(null)
    }
  }

  const runAdminAudit = async (websiteId: string) => {
    setAuditRunningId(websiteId)
    setError(null)
    try {
      const res = await api.admin.runWebsiteAudit(websiteId) as {
        success?: boolean
        error?: string
      }
      if (!res?.success) setError(res?.error || "Failed to enqueue audit")
    } catch (err: any) {
      setError(err.message || "Failed to enqueue audit")
    } finally {
      setAuditRunningId(null)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { limit, offset }
      if (analyticsFilter === "enabled") params.analytics = true
      else if (analyticsFilter === "disabled") params.analytics = false
      if (search.trim()) params.search = search.trim()

      const [websitesRes, statsRes] = await Promise.all([
        api.admin.getAdminWebsites(params),
        api.admin.getAdminWebsiteStats(),
      ]) as any[]

      if (websitesRes.success) {
        setWebsites(websitesRes.websites || [])
        setTotal(websitesRes.total || 0)
      }
      if (statsRes.success) setStats(statsRes.stats)
    } catch (err: any) {
      setError(err.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [analyticsFilter, offset])

  const handleSearch = () => {
    setOffset(0)
    fetchData()
  }

  return (
    <TooltipProvider>
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Websites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All websites across organizations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 self-start">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{formatNumber(stats.total)}</p>
              <p className="text-xs text-muted-foreground">Total Websites</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-green-600">{formatNumber(stats.analyticsEnabled)}</p>
              <p className="text-xs text-muted-foreground">Analytics Enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-muted-foreground">{formatNumber(stats.analyticsDisabled)}</p>
              <p className="text-xs text-muted-foreground">Analytics Disabled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={analyticsFilter} onValueChange={(v) => { setAnalyticsFilter(v); setOffset(0) }}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Analytics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="enabled">Analytics Enabled</SelectItem>
              <SelectItem value="disabled">Analytics Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch} className="h-9">Search</Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : websites.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Website</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead className="min-w-[140px]">Site tracking</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {websites.map((website) => (
                    <TableRow key={website.id}>
                      <TableCell className="font-medium">{website.name || "-"}</TableCell>
                      <TableCell>
                        <a
                          href={`https://${website.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {website.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate max-w-[120px]">{website.organization?.name || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={!!website.analytics}
                                  disabled={
                                    analyticsBusyId === website.id ||
                                    !website.organization?.analytics_enabled
                                  }
                                  onCheckedChange={(v) => void setWebsiteAnalytics(website.id, v)}
                                  aria-label={`Analytics tracking for ${website.domain}`}
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {website.analytics ? "On" : "Off"}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {!website.organization?.analytics_enabled
                                ? "Turn on workspace analytics in Admin → Organizations first. Enabling org analytics also turns on tracking for all sites in that org."
                                : website.analytics
                                  ? "Visitor tracking script is allowed for this domain. Events go to your analytics pipeline."
                                  : "Tracking script off for this site. Toggle on to collect page views (org analytics must stay on)."}
                            </TooltipContent>
                          </Tooltip>
                          {website.analytics ? (
                            <Badge className="w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs hidden sm:inline-flex">
                              <BarChart3 className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="w-fit text-xs hidden sm:inline-flex">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {website.created_at ? formatDate(website.created_at, { relative: true }) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={auditRunningId === website.id}
                                onClick={() => void runAdminAudit(website.id)}
                                aria-label="Run site audit"
                              >
                                {auditRunningId === website.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Gauge className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Run Lighthouse audit (mobile homepage) for this website
                            </TooltipContent>
                          </Tooltip>
                          {website.organization?.slug && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/${website.organization.slug}/audits`}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Org audits">
                                    <Globe className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>Open organization Site Audits</TooltipContent>
                            </Tooltip>
                          )}
                          {website.organization?.slug && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/${website.organization.slug}/analytics`}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Analytics">
                                    <BarChart3 className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>Analytics</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No websites found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}
