"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  MessageSquare, 
  Plus, 
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
  FileText,
  Calendar,
  User as UserIcon
} from "lucide-react"
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/types/support"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

export default function SupportPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("tickets")
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // New ticket form
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "general" as const,
    priority: "medium" as const
  })

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
      return
    }
    
    if (session) {
      fetchTickets()
    }
  }, [session, isPending])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const result = await api.support.getTickets()
      const res = result as { success?: boolean; tickets?: any[]; data?: any[]; error?: string }
      if (res.success) {
        setTickets(res.tickets || res.data || [])
      } else {
        toast.error(res.error || "Failed to fetch tickets")
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast.error("Failed to fetch tickets")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setCreating(true)
    try {
      const result = await api.support.createTicket(newTicket)
      if (result.success) {
        toast.success("Support ticket created successfully!")
        setNewTicket({ title: "", description: "", category: "general", priority: "medium" })
        setActiveTab("tickets")
        fetchTickets()
      } else {
        toast.error(result.error || "Failed to create ticket")
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      toast.error("Failed to create ticket")
    } finally {
      setCreating(false)
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
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Support Center</h1>
              <p className="text-muted-foreground">Get help with your account and platform issues</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
            <TabsTrigger value="new">Create Ticket</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
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
                </div>
              </CardContent>
            </Card>

            {/* Tickets List */}
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
            ) : filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No support tickets found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== "all" 
                      ? "No tickets match your current filters."
                      : "You haven't created any support tickets yet."
                    }
                  </p>
                  {!searchQuery && statusFilter === "all" && (
                    <Button onClick={() => setActiveTab("new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Ticket
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/support/${ticket.id}`)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{ticket.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {ticket.ticket_number}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(ticket.category)}
                            <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{ticket.message_count ?? ticket._count?.support_messages ?? 0} messages</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and we'll help you resolve it as quickly as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTicket} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      placeholder="Brief description of your issue"
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Select value={newTicket.category} onValueChange={(value: any) => setNewTicket({ ...newTicket, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORT_CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(category.id)}
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={newTicket.priority} onValueChange={(value: any) => setNewTicket({ ...newTicket, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORT_PRIORITIES.map((priority) => (
                            <SelectItem key={priority.id} value={priority.id}>
                              <div className="flex items-center gap-2">
                                <span className={priority.color}>{priority.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description *</label>
                    <Textarea
                      placeholder="Please provide detailed information about your issue. Include any error messages, steps to reproduce, and what you were trying to do."
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Ticket
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setActiveTab("tickets")}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Need Help Choosing?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SUPPORT_CATEGORIES.map((category) => (
                    <div key={category.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(category.id)}
                        <h4 className="font-medium">{category.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                      <div className="text-xs text-muted-foreground">
                        <strong>Common issues:</strong> {category.common_issues.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
