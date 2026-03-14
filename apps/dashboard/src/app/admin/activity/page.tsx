"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Activity,
  Users,
  Clock,
  Timer,
  Search,
  RefreshCw,
  TrendingUp,
  Eye,
  Wifi,
} from "lucide-react"
import { getActivityOverview, getActivityUsers } from "@/lib/actions/admin-actions"
import { useRealtime } from "@/components/realtime/realtime-provider"

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.round((ms % 3_600_000) / 60_000)
  return `${hours}h ${mins}m`
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60_000) return "Just now"
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

export default function AdminActivityPage() {
  const { onlineUsers } = useRealtime()
  const [overview, setOverview] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("week")
  const [search, setSearch] = useState("")
  const [total, setTotal] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [overviewRes, usersRes] = await Promise.all([
        getActivityOverview(),
        getActivityUsers(period, search || undefined),
      ])
      if (overviewRes.success) setOverview(overviewRes.overview)
      if (usersRes.success) {
        setUsers(usersRes.users || [])
        setTotal(usersRes.total || 0)
      }
    } catch (error) {
      console.error("Failed to load activity data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [period, search])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            User Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard usage analytics and online activity tracking
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 self-start">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      {loading && !overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{overview.online_now}</p>
                  <p className="text-xs text-muted-foreground">Online Now</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                  <Wifi className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold">{overview.active_today}</p>
                  <p className="text-xs text-muted-foreground">Active Today</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatDuration(overview.total_time_week_ms)}</p>
                  <p className="text-xs text-muted-foreground">Total Time (Week)</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatDuration(overview.avg_session_week_ms)}</p>
                  <p className="text-xs text-muted-foreground">Avg Session (Week)</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                  <Timer className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Additional stats row */}
      {overview && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-lg font-semibold">{overview.sessions_today}</p>
              <p className="text-xs text-muted-foreground">Sessions Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-lg font-semibold">{overview.sessions_week}</p>
              <p className="text-xs text-muted-foreground">Sessions This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-lg font-semibold">{formatDuration(overview.total_time_today_ms)}</p>
              <p className="text-xs text-muted-foreground">Total Time Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-User Dashboard Usage</CardTitle>
          <CardDescription>{total} users total</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Time</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Avg Session</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || ""} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                              {user.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-background ${user.is_online || onlineUsers.has(user.id) ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_online || onlineUsers.has(user.id) ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Online</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Offline</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatDuration(user.total_time_ms || 0)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.session_count || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDuration(user.avg_session_ms || 0)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {timeAgo(user.lastSeenAt)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                        <Link href={`/admin/users/${user.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No users match your search" : "No activity data yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
