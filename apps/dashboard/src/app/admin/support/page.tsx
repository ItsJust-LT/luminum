"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MessageSquare, Search, Clock, CheckCircle, AlertCircle,
  HelpCircle, Wrench, CreditCard, Lightbulb, Bug, Globe,
  User, Calendar, Building2, TrendingUp, RefreshCw,
  MoreHorizontal, ArrowUpRight, UserCheck, AlertTriangle,
  Inbox, Timer, CircleDot, XCircle, Hourglass,
} from "lucide-react"
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/types/support"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const CATEGORY_ICONS: Record<string, any> = {
  HelpCircle, Wrench, CreditCard, Lightbulb, Bug, Globe, User,
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "open": return <CircleDot className="h-3.5 w-3.5 text-green-500" />
    case "in_progress": return <Clock className="h-3.5 w-3.5 text-blue-500" />
    case "waiting_for_user": return <Hourglass className="h-3.5 w-3.5 text-yellow-500" />
    case "resolved": return <CheckCircle className="h-3.5 w-3.5 text-purple-500" />
    case "closed": return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
    default: return <CircleDot className="h-3.5 w-3.5" />
  }
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { low: "bg-gray-400", medium: "bg-blue-400", high: "bg-orange-500", urgent: "bg-red-500" }
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[priority] || "bg-gray-400"}`} />
}

function timeAgo(date: string) {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

export default function AdminSupportPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("all")
  const [tickets, setTickets] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  useEffect(() => {
    if (!isPending && !session) { router.push("/sign-in"); return }
    if (session && (session.user as any)?.role !== "admin") { router.push("/dashboard"); return }
    if (session) { fetchData(); fetchAdminUsers() }
  }, [session, isPending])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ticketsResult, statsResult] = await Promise.all([api.support.getTickets(), api.support.getStats()]) as any[]
      if (ticketsResult?.success) setTickets(ticketsResult.tickets ?? ticketsResult.data ?? [])
      if (statsResult?.success) setStats(statsResult.stats ?? statsResult.data)
    } catch { toast.error("Failed to fetch data") }
    finally { setLoading(false) }
  }, [])

  const fetchAdminUsers = async () => {
    const result = await api.support.getAdminUsers() as any
    if (result?.success) setAdminUsers(result.users ?? result.data ?? [])
  }

  const handleQuickAssign = async (ticketId: string, adminId: string) => {
    const result = await api.support.updateTicket(ticketId, { assigned_to: adminId }) as any
    if (result?.success) { toast.success("Ticket assigned"); fetchData() }
    else toast.error("Failed to assign")
  }

  const handleQuickStatusChange = async (ticketId: string, status: string) => {
    const result = await api.support.updateTicket(ticketId, { status }) as any
    if (result?.success) { toast.success("Status updated"); fetchData() }
    else toast.error("Failed to update status")
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchQuery ||
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" ? true
      : statusFilter === "active" ? !["resolved", "closed"].includes(ticket.status)
      : ticket.status === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter
    const matchesAssignee = assigneeFilter === "all" ? true
      : assigneeFilter === "unassigned" ? !ticket.assigned_to
      : ticket.assigned_to === assigneeFilter
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee
  })

  const urgentTickets = tickets.filter(t => (t.priority === "urgent" || t.priority === "high") && !["resolved", "closed"].includes(t.status))
  const unassignedTickets = tickets.filter(t => !t.assigned_to && !["resolved", "closed"].includes(t.status))
  const myTickets = tickets.filter(t => t.assigned_to === session?.user?.id && !["resolved", "closed"].includes(t.status))

  if (isPending) return <AdminSupportSkeleton />
  if (!session || (session.user as any)?.role !== "admin") return null

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support Center</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and resolve support tickets</p>
          </div>
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Open" value={stats.open_tickets} icon={<CircleDot className="h-4 w-4 text-green-500" />} onClick={() => { setStatusFilter("open"); setActiveTab("all") }} />
            <StatCard label="In Progress" value={stats.in_progress_tickets} icon={<Clock className="h-4 w-4 text-blue-500" />} onClick={() => { setStatusFilter("in_progress"); setActiveTab("all") }} />
            <StatCard label="Waiting" value={stats.waiting_for_user_tickets} icon={<Hourglass className="h-4 w-4 text-yellow-500" />} onClick={() => { setStatusFilter("waiting_for_user"); setActiveTab("all") }} />
            <StatCard label="Urgent" value={stats.urgent_tickets} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} accent="red" onClick={() => { setPriorityFilter("urgent"); setStatusFilter("active"); setActiveTab("all") }} />
            <StatCard label="Unassigned" value={stats.unassigned_tickets} icon={<Inbox className="h-4 w-4 text-orange-500" />} accent="orange" onClick={() => { setAssigneeFilter("unassigned"); setStatusFilter("active"); setActiveTab("all") }} />
            <StatCard label="Avg Response" value={`${stats.avg_response_time || 0}h`} icon={<Timer className="h-4 w-4 text-muted-foreground" />} />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">All Tickets <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{tickets.length}</Badge></TabsTrigger>
              <TabsTrigger value="urgent" className="gap-1.5">Urgent <Badge variant="destructive" className="ml-1 text-xs h-5 px-1.5">{urgentTickets.length}</Badge></TabsTrigger>
              <TabsTrigger value="unassigned" className="gap-1.5">Unassigned <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{unassignedTickets.length}</Badge></TabsTrigger>
              <TabsTrigger value="mine" className="gap-1.5">My Tickets <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{myTickets.length}</Badge></TabsTrigger>
            </TabsList>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tickets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                {SUPPORT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {SUPPORT_PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {SUPPORT_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {adminUsers.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(statusFilter !== "active" || priorityFilter !== "all" || categoryFilter !== "all" || assigneeFilter !== "all" || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("active"); setPriorityFilter("all"); setCategoryFilter("all"); setAssigneeFilter("all"); setSearchQuery("") }}>
                Clear filters
              </Button>
            )}
          </div>

          <TabsContent value="all" className="mt-4">
            <TicketTable tickets={filteredTickets} loading={loading} router={router} adminUsers={adminUsers} onAssign={handleQuickAssign} onStatusChange={handleQuickStatusChange} />
          </TabsContent>
          <TabsContent value="urgent" className="mt-4">
            <TicketTable tickets={urgentTickets} loading={loading} router={router} adminUsers={adminUsers} onAssign={handleQuickAssign} onStatusChange={handleQuickStatusChange} emptyIcon={<CheckCircle className="h-10 w-10 text-green-500" />} emptyTitle="No urgent tickets" emptyDesc="All high-priority tickets have been resolved." />
          </TabsContent>
          <TabsContent value="unassigned" className="mt-4">
            <TicketTable tickets={unassignedTickets} loading={loading} router={router} adminUsers={adminUsers} onAssign={handleQuickAssign} onStatusChange={handleQuickStatusChange} emptyIcon={<UserCheck className="h-10 w-10 text-green-500" />} emptyTitle="All tickets assigned" emptyDesc="Every open ticket has an assignee." />
          </TabsContent>
          <TabsContent value="mine" className="mt-4">
            <TicketTable tickets={myTickets} loading={loading} router={router} adminUsers={adminUsers} onAssign={handleQuickAssign} onStatusChange={handleQuickStatusChange} emptyIcon={<Inbox className="h-10 w-10 text-muted-foreground" />} emptyTitle="No tickets assigned to you" emptyDesc="Tickets assigned to you will appear here." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, accent, onClick }: { label: string; value: number | string; icon: React.ReactNode; accent?: string; onClick?: () => void }) {
  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${accent === "red" ? "border-red-200 dark:border-red-800" : accent === "orange" ? "border-orange-200 dark:border-orange-800" : ""}`} onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted">{icon}</div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TicketTable({ tickets, loading, router, adminUsers, onAssign, onStatusChange, emptyIcon, emptyTitle, emptyDesc }: {
  tickets: any[]; loading: boolean; router: any; adminUsers: any[]; onAssign: (id: string, adminId: string) => void; onStatusChange: (id: string, status: string) => void;
  emptyIcon?: React.ReactNode; emptyTitle?: string; emptyDesc?: string;
}) {
  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )

  if (tickets.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {emptyIcon || <MessageSquare className="h-10 w-10 text-muted-foreground" />}
      <h3 className="mt-4 text-lg font-semibold">{emptyTitle || "No tickets found"}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{emptyDesc || "Adjust your filters or check back later."}</p>
    </div>
  )

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="hidden lg:grid grid-cols-[auto_1fr_140px_100px_100px_140px_60px] gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span className="w-4" />
        <span>Ticket</span>
        <span>Requester</span>
        <span>Priority</span>
        <span>Category</span>
        <span>Updated</span>
        <span />
      </div>
      <div className="divide-y">
        {tickets.map(ticket => (
          <div key={ticket.id} className="grid grid-cols-1 lg:grid-cols-[auto_1fr_140px_100px_100px_140px_60px] gap-2 lg:gap-4 items-center px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => router.push(`/admin/support/${ticket.id}`)}>
            {/* Status dot */}
            <div className="hidden lg:flex"><StatusIcon status={ticket.status} /></div>

            {/* Ticket info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{ticket.title}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{ticket.ticket_number}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">
                  {SUPPORT_STATUSES.find(s => s.id === ticket.status)?.name || ticket.status}
                </Badge>
                {ticket.assigned_user ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />{ticket.assigned_user.name}
                  </span>
                ) : (
                  <span className="text-xs text-orange-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />Unassigned
                  </span>
                )}
                {ticket.message_count > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />{ticket.message_count}
                  </span>
                )}
              </div>
            </div>

            {/* Requester */}
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={ticket.user?.image} />
                <AvatarFallback className="text-[10px]">{ticket.user?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs truncate">{ticket.user?.name || "Unknown"}</p>
                {ticket.organization && <p className="text-[10px] text-muted-foreground truncate">{ticket.organization.name}</p>}
              </div>
            </div>

            {/* Priority */}
            <div className="hidden lg:flex items-center gap-1.5">
              <PriorityDot priority={ticket.priority} />
              <span className="text-xs capitalize">{ticket.priority}</span>
            </div>

            {/* Category */}
            <div className="hidden lg:flex items-center gap-1.5">
              {(() => {
                const cat = SUPPORT_CATEGORIES.find(c => c.id === ticket.category)
                const Icon = cat ? CATEGORY_ICONS[cat.icon] : MessageSquare
                return Icon ? <Icon className="h-3 w-3 text-muted-foreground" /> : null
              })()}
              <span className="text-xs capitalize truncate">{ticket.category?.replace(/_/g, " ")}</span>
            </div>

            {/* Updated */}
            <div className="hidden lg:block">
              <span className="text-xs text-muted-foreground">{timeAgo(ticket.updated_at)}</span>
            </div>

            {/* Actions */}
            <div className="hidden lg:flex justify-end" onClick={e => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push(`/admin/support/${ticket.id}`)}>
                    <ArrowUpRight className="h-4 w-4 mr-2" />Open ticket
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {SUPPORT_STATUSES.filter(s => s.id !== ticket.status).map(s => (
                    <DropdownMenuItem key={s.id} onClick={() => onStatusChange(ticket.id, s.id)}>
                      <StatusIcon status={s.id} /><span className="ml-2">Mark {s.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {adminUsers.map(a => (
                    <DropdownMenuItem key={a.id} onClick={() => onAssign(ticket.id, a.id)}>
                      <UserCheck className="h-4 w-4 mr-2" />Assign to {a.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminSupportSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    </div>
  )
}
