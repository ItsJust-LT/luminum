"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth/client"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MessageSquare, 
  ArrowLeft,
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
  Send,
  Paperclip,
  FileText
} from "lucide-react"
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/types/support"
import { getSupportTicket, addSupportMessage } from "@/lib/actions/support-actions"
import { SupportMessagesProvider } from "@/contexts/support-messages-context"
import { ChatUI } from "@/components/support/chat-ui"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function SupportTicketDetailPage() {
  const { data: session, isPending } = useSession()
  const params = useParams()
  const router = useRouter()
  const ticketId = params.ticketId as string
  
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState("")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
      return
    }
    
    if (session && ticketId) {
      fetchTicket()
    }
  }, [session, isPending, ticketId])

  const fetchTicket = async () => {
    setLoading(true)
    try {
      const result = await getSupportTicket(ticketId)
      if (result.success) {
        setTicket(result.data)
      } else {
        toast.error(result.error || "Failed to fetch ticket")
        router.push("/support")
      }
    } catch (error) {
      console.error("Error fetching ticket:", error)
      toast.error("Failed to fetch ticket")
      router.push("/support")
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) {
      toast.error("Please enter a message")
      return
    }

    setSending(true)
    try {
      const result = await addSupportMessage(ticketId, {
        message: newMessage.trim()
      })
      if (result.success) {
        setNewMessage("")
        fetchTicket() // Refresh to get new message
        toast.success("Message sent successfully!")
      } else {
        toast.error(result.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    } finally {
      setSending(false)
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

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (isPending || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!session || !ticket) {
    return null
  }

  return (
    <SupportMessagesProvider ticketId={ticketId}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push("/support")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Support
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{ticket.title}</h1>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="text-xs">
                  {ticket.ticket_number}
                </Badge>
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getCategoryIcon(ticket.category)}
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="font-medium mb-2">Category</h4>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(ticket.category)}
                    <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Created</h4>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(ticket.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {ticket.assigned_user && (
                  <div>
                    <h4 className="font-medium mb-2">Assigned To</h4>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.assigned_user.image} />
                        <AvatarFallback>{ticket.assigned_user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{ticket.assigned_user.name}</span>
                    </div>
                  </div>
                )}
                {ticket.resolved_at && (
                  <div>
                    <h4 className="font-medium mb-2">Resolved</h4>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{new Date(ticket.resolved_at).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat UI */}
          {ticket.status !== 'closed' && (
            <ChatUI />
          )}
        </div>
        </div>
      </div>
    </SupportMessagesProvider>
  )
}
