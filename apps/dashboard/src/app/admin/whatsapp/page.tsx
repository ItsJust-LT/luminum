"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageCircle,
  RefreshCw,
  TrendingUp,
  Users,
  MessageSquare,
  Phone,
  Clock,
  PowerOff,
  Wifi,
  Building2,
  Infinity as InfinityIcon,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Image,
  Send,
  Inbox,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { api } from "@/lib/api"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { toast } from "sonner"

interface LiveClientEntry {
  organizationId: string
  accountId: string
  organizationName: string
  organizationSlug: string | null
  phoneNumber: string
  status: string
  connectedAt: string | null
  lastSeenAt: string | null
  runningSinceMs: number | null
  alwaysOn: boolean
}

interface AnalyticsData {
  totalAccounts: number
  connectedAccounts: number
  totalMessages: number
  totalSent: number
  totalReceived: number
  totalMediaSent: number
  totalMediaReceived: number
  messagesLast24h: number
  messagesLast7d: number
  messagesByDay: { day: string; sent: number; received: number; count: number }[]
  messagesByOrg: { organizationId: string; organizationName: string; messageCount: number; sentCount: number; receivedCount: number }[]
  inboundOutboundByDay: { day: string; sent: number; received: number; mediaSent: number; mediaReceived: number }[]
}

function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return "—"
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h % 24 > 0) parts.push(`${h % 24}h`)
  if (m % 60 > 0) parts.push(`${m % 60}m`)
  if (parts.length === 0) parts.push("< 1m")
  return parts.join(" ")
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  const now = new Date()
  const s = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return d.toLocaleDateString()
}

const volumeChartConfig: ChartConfig = {
  sent: { label: "Sent", color: "#22c55e" },
  received: { label: "Received", color: "#3b82f6" },
}

const mediaChartConfig: ChartConfig = {
  mediaSent: { label: "Media sent", color: "#f59e0b" },
  mediaReceived: { label: "Media received", color: "#8b5cf6" },
}

export default function AdminWhatsAppPage() {
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [clients, setClients] = useState<LiveClientEntry[]>([])
  const [days, setDays] = useState("30")
  const [shuttingDown, setShuttingDown] = useState<string | null>(null)
  const [togglingAlwaysOn, setTogglingAlwaysOn] = useState<string | null>(null)
  const [removingAll, setRemovingAll] = useState(false)
  const { connected, onMessage } = useRealtime()

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    setAnalyticsError(null)
    try {
      const res = (await api.admin.getWhatsappAnalytics({ days: parseInt(days, 10) })) as {
        success?: boolean
        analytics?: AnalyticsData
        error?: string
      }
      if (res?.success && res.analytics) setAnalytics(res.analytics)
      else setAnalyticsError(res?.error || "Failed to load analytics")
    } catch (err: unknown) {
      setAnalyticsError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally { setAnalyticsLoading(false) }
  }, [days])

  const fetchClients = useCallback(async () => {
    setClientsLoading(true)
    setClientsError(null)
    try {
      const res = (await api.admin.getWhatsappLiveClients()) as { success?: boolean; clients?: LiveClientEntry[]; error?: string }
      if (res?.success && Array.isArray(res.clients)) setClients(res.clients)
      else setClientsError(res?.error || "Failed to load clients")
    } catch (err: unknown) {
      setClientsError(err instanceof Error ? err.message : "Failed to load clients")
    } finally { setClientsLoading(false) }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  useEffect(() => { fetchClients() }, [fetchClients])

  useEffect(() => {
    const unsubConnect = onMessage("whatsapp:client_connected", () => fetchClients())
    const unsubDisconnect = onMessage("whatsapp:client_disconnected", () => fetchClients())
    return () => { unsubConnect(); unsubDisconnect() }
  }, [onMessage, fetchClients])

  const handleShutdown = async (organizationId: string) => {
    setShuttingDown(organizationId)
    try { await api.admin.shutdownWhatsappClient(organizationId); toast.success("Client shutdown"); await fetchClients() }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Shutdown failed") }
    finally { setShuttingDown(null) }
  }

  const handleAlwaysOn = async (organizationId: string, enabled: boolean) => {
    setTogglingAlwaysOn(organizationId)
    try { await api.admin.setWhatsappAlwaysOn(organizationId, enabled); toast.success(enabled ? "Always-on enabled" : "Always-on disabled"); await fetchClients() }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Update failed") }
    finally { setTogglingAlwaysOn(null) }
  }

  const handleRemoveAll = async () => {
    setRemovingAll(true)
    try { await api.admin.removeAllWhatsappData(); toast.success("All WhatsApp data has been removed."); await Promise.all([fetchAnalytics(), fetchClients()]) }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to remove WhatsApp data") }
    finally { setRemovingAll(false) }
  }

  const volumeData = analytics?.messagesByDay?.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  })) ?? []

  const mediaData = analytics?.inboundOutboundByDay?.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  })) ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-green-600" />
            WhatsApp
            {connected && (
              <Badge variant="secondary" className="font-normal gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <Wifi className="h-3 w-3" /> Live
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Analytics, live clients, and data management</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => { fetchAnalytics(); fetchClients() }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Analytics</h2>
        {analyticsLoading && !analytics ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : analyticsError ? (
          <Card className="border-destructive/30"><CardContent className="py-6 text-center text-muted-foreground">{analyticsError}</CardContent></Card>
        ) : analytics ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" /> Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analytics.totalAccounts}</p>
                  <p className="text-xs text-muted-foreground">{analytics.connectedAccounts} connected</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Total messages</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analytics.totalMessages.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">in selected period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Send className="h-4 w-4 text-green-600" /> Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{analytics.totalSent.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{analytics.totalMediaSent.toLocaleString()} media</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Inbox className="h-4 w-4 text-blue-600" /> Received</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">{analytics.totalReceived.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{analytics.totalMediaReceived.toLocaleString()} media</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Messages (24h)</CardTitle>
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{analytics.messagesLast24h.toLocaleString()}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Messages (7d)</CardTitle>
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{analytics.messagesLast7d.toLocaleString()}</p></CardContent>
              </Card>
            </div>

            {/* ── Volume chart: sent vs received ─────────────────────────────── */}
            {volumeData.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Message volume</CardTitle>
                  <CardDescription>Sent vs received per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={volumeChartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={volumeData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="sent" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} strokeWidth={2} />
                        <Area type="monotone" dataKey="received" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* ── Media chart ─────────────────────────────────────────────────── */}
            {mediaData.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" /> Media messages</CardTitle>
                  <CardDescription>Media sent vs received per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={mediaChartConfig} className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mediaData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="mediaSent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="mediaReceived" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* ── Top organizations ────────────────────────────────────────────── */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Top organizations by activity</CardTitle>
                <CardDescription>Messages in selected period (top 50)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1"><ArrowUpRight className="h-3 w-3 text-green-600" /> Sent</span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1"><ArrowDownLeft className="h-3 w-3 text-blue-600" /> Received</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.messagesByOrg.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                    ) : (
                      analytics.messagesByOrg.map((row) => (
                        <TableRow key={row.organizationId}>
                          <TableCell className="font-medium">{row.organizationName}</TableCell>
                          <TableCell className="text-right">{row.messageCount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-600">{row.sentCount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-blue-600">{row.receivedCount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>

      {/* ── Live clients ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5" /> Live clients
          {connected && <Badge variant="outline" className="font-normal text-muted-foreground">Updates in real time</Badge>}
        </h2>
        <Card>
          {clientsLoading && clients.length === 0 ? (
            <CardContent className="py-8"><Skeleton className="h-32 w-full rounded-lg" /></CardContent>
          ) : clientsError ? (
            <CardContent className="py-6 text-center text-muted-foreground">{clientsError}</CardContent>
          ) : clients.length === 0 ? (
            <CardContent className="py-8 text-center text-muted-foreground">No WhatsApp clients are currently running on this server.</CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Always on</TableHead>
                  <TableHead>Running since</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.organizationId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{c.organizationName}</p>
                          {c.organizationSlug && <p className="text-xs text-muted-foreground">{c.organizationSlug}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="font-mono text-sm">{c.phoneNumber ? `+${c.phoneNumber}` : "—"}</span></TableCell>
                    <TableCell><Badge variant={c.status === "CONNECTED" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant={c.alwaysOn ? "default" : "outline"} size="sm" className="gap-1"
                        disabled={togglingAlwaysOn === c.organizationId || c.status !== "CONNECTED"}
                        onClick={() => handleAlwaysOn(c.organizationId, !c.alwaysOn)}>
                        {togglingAlwaysOn === c.organizationId ? <RefreshCw className="h-4 w-4 animate-spin" /> : <InfinityIcon className="h-4 w-4" />}
                        {c.alwaysOn ? "On" : "Off"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{formatDuration(c.runningSinceMs)}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatRelative(c.lastSeenAt)}</TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => handleShutdown(c.organizationId)} disabled={shuttingDown === c.organizationId}>
                        {shuttingDown === c.organizationId ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><PowerOff className="h-4 w-4 mr-1" />Shutdown</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>

      {/* ── Danger zone ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Danger zone</h2>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Remove all WhatsApp data</CardTitle>
            <CardDescription>Permanently delete every WhatsApp account and cached data across all organizations. All clients will be shut down.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={removingAll}>
                  {removingAll ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Remove all WhatsApp data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove all WhatsApp data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will shut down all WhatsApp clients, clear all Redis-cached chats and messages, and delete every account. Organizations will need to connect again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemoveAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {removingAll ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}Remove all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
