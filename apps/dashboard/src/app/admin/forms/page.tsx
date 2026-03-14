"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Eye,
  Phone,
  MoreHorizontal,
  Clock,
  Filter,
  Building2,
} from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"
import { getAdminFormSubmissions, getAdminFormStats, updateAdminFormSubmissionStatus } from "@/lib/actions/admin-actions"
import { toast } from "sonner"

export default function AdminFormsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [offset, setOffset] = useState(0)
  const limit = 25

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { limit, offset }
      if (statusFilter === "unseen") params.seen = false
      else if (statusFilter === "seen") params.seen = true
      else if (statusFilter === "contacted") params.contacted = true

      const [subsRes, statsRes] = await Promise.all([
        getAdminFormSubmissions(params),
        getAdminFormStats(),
      ])

      if (subsRes.success) {
        setSubmissions(subsRes.submissions || [])
        setTotal(subsRes.total || 0)
      }
      if (statsRes.success) setStats(statsRes.stats)
    } catch (err: any) {
      setError(err.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [statusFilter, offset])

  const handleStatusUpdate = async (id: string, data: { seen?: boolean; contacted?: boolean }) => {
    try {
      const res = await updateAdminFormSubmissionStatus(id, data)
      if (res.success) {
        toast.success("Status updated")
        fetchData()
      }
    } catch {
      toast.error("Failed to update")
    }
  }

  const getSubmissionPreview = (data: any): string => {
    if (!data || typeof data !== "object") return "-"
    const values = Object.values(data).filter(v => typeof v === "string" && v.length > 0)
    return values.slice(0, 2).join(" - ").substring(0, 60) || "-"
  }

  const getStatusBadge = (sub: any) => {
    if (sub.contacted) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Contacted</Badge>
    if (sub.seen) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Seen</Badge>
    return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs">Pending</Badge>
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Form Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All form submissions across organizations
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{formatNumber(stats.total)}</p>
              <p className="text-xs text-muted-foreground">Total Submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-orange-600">{formatNumber(stats.unseen)}</p>
              <p className="text-xs text-muted-foreground">Unseen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-green-600">{formatNumber(stats.contacted)}</p>
              <p className="text-xs text-muted-foreground">Contacted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.recentCount)}</p>
              <p className="text-xs text-muted-foreground">Last 30 Days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0) }}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unseen">Unseen</SelectItem>
              <SelectItem value="seen">Seen</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {formatNumber(total)} total
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : submissions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(sub.submitted_at, { relative: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate max-w-[120px]">{sub.organizationName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[120px]">{sub.websiteDomain || sub.websiteName || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {getSubmissionPreview(sub.data)}
                      </TableCell>
                      <TableCell>{getStatusBadge(sub)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!sub.seen && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(sub.id, { seen: true })}>
                                <Eye className="h-4 w-4 mr-2" /> Mark as seen
                              </DropdownMenuItem>
                            )}
                            {!sub.contacted && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(sub.id, { contacted: true })}>
                                <Phone className="h-4 w-4 mr-2" /> Mark as contacted
                              </DropdownMenuItem>
                            )}
                            {sub.contacted && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(sub.id, { contacted: false })}>
                                <Clock className="h-4 w-4 mr-2" /> Unmark contacted
                              </DropdownMenuItem>
                            )}
                            {sub.organizationSlug && (
                              <DropdownMenuItem asChild>
                                <Link href={`/${sub.organizationSlug}/forms/${sub.id}`}>
                                  <FileText className="h-4 w-4 mr-2" /> View details
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
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
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No form submissions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
