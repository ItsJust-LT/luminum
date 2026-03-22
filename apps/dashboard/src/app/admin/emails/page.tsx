"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  RefreshCw,
  AlertCircle,
  Inbox,
  Send,
  Filter,
  Search,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"
import { api } from "@/lib/api"

export default function AdminEmailsPage() {
  const [mailSystemEnabled, setMailSystemEnabled] = useState<boolean | null>(null)
  const [mailSystemMessage, setMailSystemMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emails, setEmails] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [readFilter, setReadFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [offset, setOffset] = useState(0)
  const limit = 25

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const statusRes = (await api.admin.getEmailSystemStatus()) as {
        success?: boolean
        enabled?: boolean
        message?: string
      }
      if (statusRes.success) {
        setMailSystemEnabled(!!statusRes.enabled)
        setMailSystemMessage(statusRes.message || null)
      }

      const params: any = { limit, offset }
      if (directionFilter !== "all") params.direction = directionFilter
      if (readFilter === "unread") params.read = false
      else if (readFilter === "read") params.read = true
      if (search.trim()) params.search = search.trim()

      const [emailsRes, statsRes] = await Promise.all([
        api.admin.getAdminEmails(params),
        api.admin.getAdminEmailStats(),
      ]) as any[]

      if (emailsRes.success) {
        setEmails(emailsRes.emails || [])
        setTotal(emailsRes.total || 0)
      }
      if (statsRes.success) setStats(statsRes.stats)
    } catch (err: any) {
      setError(err.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [directionFilter, readFilter, offset])

  const handleSearch = () => {
    setOffset(0)
    fetchData()
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {mailSystemEnabled === false && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-destructive">Platform email is disabled</p>
              <p className="text-muted-foreground">
                {mailSystemMessage ||
                  "EMAIL_SYSTEM_ENABLED is false on the API server. Inbound webhooks and sending are rejected. Users see a generic unavailable message. See Admin → Environment for variables."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide email monitoring
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{formatNumber(stats.total)}</p>
              <p className="text-xs text-muted-foreground">Total Emails</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-orange-600">{formatNumber(stats.unread)}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.inbound)}</p>
              <p className="text-xs text-muted-foreground">Inbound</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-green-600">{formatNumber(stats.outbound)}</p>
              <p className="text-xs text-muted-foreground">Outbound</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold text-purple-600">{formatNumber(stats.recentCount)}</p>
              <p className="text-xs text-muted-foreground">Last 30 Days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* By Organization */}
      {stats?.byOrg && stats.byOrg.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Emails by Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byOrg.map((item: any, i: number) => {
                const maxCount = stats.byOrg[0]?.count || 1
                const width = Math.max((item.count / maxCount) * 100, 8)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="relative h-8 rounded-md overflow-hidden bg-muted/30">
                        <div className="absolute inset-y-0 left-0 bg-purple-500/10 rounded-md" style={{ width: `${width}%` }} />
                        <span className="absolute inset-0 flex items-center px-3 text-xs font-medium truncate">{item.organizationName}</span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-12 text-right flex-shrink-0">{formatNumber(item.count)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={directionFilter} onValueChange={(v) => { setDirectionFilter(v); setOffset(0) }}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setOffset(0) }}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Read" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch} className="h-9">Search</Button>
        </div>
      </div>

      {/* Email List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : emails.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]" />
                    <TableHead>Subject</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id} className={!email.read ? "font-medium" : ""}>
                      <TableCell>
                        {email.direction === "inbound" ? (
                          <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell className="truncate max-w-[200px]">{email.subject || "(no subject)"}</TableCell>
                      <TableCell className="text-sm truncate max-w-[150px]">{email.from_address || "-"}</TableCell>
                      <TableCell className="text-sm truncate max-w-[150px]">{email.to_address || "-"}</TableCell>
                      <TableCell className="text-sm truncate max-w-[120px]">{email.organization?.name || "-"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {email.receivedAt ? formatDate(email.receivedAt, { relative: true }) : "-"}
                      </TableCell>
                      <TableCell>
                        {email.read ? (
                          <Badge variant="secondary" className="text-xs">Read</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs">Unread</Badge>
                        )}
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
              <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No emails found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
