"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Wrench,
  CreditCard,
  Lightbulb,
  Bug,
  Globe,
  User,
  Calendar,
  User as UserIcon,
  Building2,
  Users,
  BarChart3,
  TrendingUp,
  Crown,
  RefreshCw
} from "lucide-react"
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/types/support"
import { getSupportTickets, getSupportStats } from "@/lib/actions/support-actions"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

export default function AdminSupportPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState("overview")
  const [tickets, setTickets] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
      return
    }
    
    if (session && (session.user as { role?: string })?.role !== "admin") {
      router.push("/dashboard")
      return
    }
    
    if (session) {
      fetchData()
    }
  }, [session, isPending])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ticketsResult, statsResult] = await Promise.all([
        getSupportTickets(),
        getSupportStats()
      ])

      if (ticketsResult.success) {
        setTickets(ticketsResult.data || [])
      } else {
        toast.error(ticketsResult.error || "Failed to fetch tickets")
      }

      if (statsResult.success) {
        setStats(statsResult.data)
      } else {
        console.error("Failed to fetch stats:", statsResult.error)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    const categoryData = SUPPORT_CATEGORIES.find(c => c.id === category)
    switch (categoryData?.icon) {
      case 'HelpCircle': return <HelpCircle className="h-4 w-4" />
      case 'Wrench': return <Wrench className="h-4 w-4" />
      case 'CreditCard': return <CreditCard className="h-4 w-4" />
      case 'Lightbulb': return <Lightbulb className="h-4 w-4" />
      case 'Bug': return <Bug className="h-4 w-4" />
      case 'Globe': return <Globe className="h-4 w-4" />
      case 'User': return <UserIcon className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusData = SUPPORT_STATUSES.find(s => s.id === status)
    return (
      <Badge className={statusData?.color || "bg-gray-100 text-gray-800"}>
        {statusData?.name || status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityData = SUPPORT_PRIORITIES.find(p => p.id === priority)
    return (
      <Badge variant="outline" className={priorityData?.color || "bg-gray-100 text-gray-800"}>
        {priorityData?.name || priority}
      </Badge>
    )
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchQuery || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Admin Support Center</h1>
                <p className="text-muted-foreground">Manage all support tickets and provide assistance</p>
              </div>
            </div>
            <Button onClick={fetchData} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">All Tickets</TabsTrigger>
            <TabsTrigger value="urgent">Urgent</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                        <p className="text-2xl font-bold">{stats.total_tickets}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.open_tickets}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.in_progress_tickets}</p>
                      </div>
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                        <p className="text-2xl font-bold text-green-600">{stats.resolved_tickets}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Priority Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Urgent Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {stats?.urgent_tickets || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tickets requiring immediate attention
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => setActiveTab("urgent")}
                  >
                    View Urgent Tickets
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <TrendingUp className="h-5 w-5" />
                    High Priority
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {stats?.high_priority_tickets || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    High priority tickets needing attention
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => {
                      setPriorityFilter("high")
                      setActiveTab("tickets")
                    }}
                  >
                    View High Priority
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
                <CardDescription>Latest support tickets that need attention</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : tickets.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                    <p className="text-muted-foreground">No support tickets have been created yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.slice(0, 5).map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                           onClick={() => router.push(`/admin/support/${ticket.id}`)}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-medium">{ticket.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {ticket.ticket_number}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{ticket.user?.name || ticket.organization?.name || 'Unknown'}</span>
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {SUPPORT_STATUSES.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      {SUPPORT_PRIORITIES.map((priority) => (
                        <SelectItem key={priority.id} value={priority.id}>
                          {priority.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {SUPPORT_CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tickets List */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all"
                      ? "No tickets match your current filters."
                      : "No support tickets have been created yet."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/admin/support/${ticket.id}`)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{ticket.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {ticket.ticket_number}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {ticket.user ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                              <span>{ticket.user?.name || ticket.organization?.name || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getCategoryIcon(ticket.category)}
                              <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="urgent" className="space-y-6">
            {/* Urgent Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Urgent Tickets
                </CardTitle>
                <CardDescription>Tickets requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-3/4" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : tickets.filter(t => t.priority === 'urgent').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No urgent tickets</h3>
                    <p className="text-muted-foreground">All urgent tickets have been resolved!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.filter(t => t.priority === 'urgent').map((ticket) => (
                      <Card key={ticket.id} className="border-red-200 dark:border-red-800 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/admin/support/${ticket.id}`)}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">{ticket.title}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {ticket.ticket_number}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                                {ticket.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  {ticket.user ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                                  <span>{ticket.user?.name || ticket.organization?.name || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getCategoryIcon(ticket.category)}
                                  <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(ticket.status)}
                              <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
