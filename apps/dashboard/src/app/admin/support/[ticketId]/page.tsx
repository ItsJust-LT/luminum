"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "@/lib/auth/client"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft, Send, Paperclip, Clock, CheckCircle, AlertCircle,
  MessageSquare, Building2, Calendar, UserCheck, Settings,
  MoreHorizontal, FileText, Download, X, Image as ImageIcon,
  CircleDot, XCircle, Hourglass, StickyNote, Eye, Lock,
  ChevronRight, ExternalLink, RefreshCw, Info,
} from "lucide-react"
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/types/support"
import {
  getSupportTicket, addSupportMessage, updateSupportTicket,
  getAdminUsers, addInternalNote, getNewMessages, markTicketRead,
} from "@/lib/actions/support-actions"
import { uploadFileToCloudinary } from "@/lib/actions/cloudinary-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatMessageTime } from "@/lib/utils/chat-utils"

function StatusBadge({ status }: { status: string }) {
  const s = SUPPORT_STATUSES.find(x => x.id === status)
  return <Badge className={cn("text-xs", s?.color || "bg-gray-100 text-gray-800")}>{s?.name || status}</Badge>
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = SUPPORT_PRIORITIES.find(x => x.id === priority)
  return <Badge variant="outline" className={cn("text-xs", p?.color || "")}>{p?.name || priority}</Badge>
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

export default function AdminSupportTicketDetailPage() {
  const { data: session, isPending } = useSession()
  const params = useParams()
  const router = useRouter()
  const ticketId = params.ticketId as string

  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [internalNotes, setInternalNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [newNote, setNewNote] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [chatTab, setChatTab] = useState<"conversation" | "notes">("conversation")
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [updating, setUpdating] = useState(false)
  const [lastPoll, setLastPoll] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isPending && !session) { router.push("/sign-in"); return }
    if (session && (session.user as any)?.role !== "admin") { router.push("/dashboard"); return }
    if (session && ticketId) { fetchTicket(); fetchAdminUsers(); markTicketRead(ticketId) }
  }, [session, isPending, ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [internalNotes])

  // Polling for new messages
  useEffect(() => {
    if (!ticketId || !session) return
    pollIntervalRef.current = setInterval(async () => {
      try {
        const since = lastPoll || new Date(Date.now() - 5000).toISOString()
        const result = await getNewMessages(ticketId, since)
        if (result.success && result.data?.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = result.data.filter((m: any) => !existingIds.has(m.id) && m.message_type !== "internal")
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
          })
          setInternalNotes(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newNotes = result.data.filter((m: any) => !existingIds.has(m.id) && m.message_type === "internal")
            return newNotes.length > 0 ? [...prev, ...newNotes] : prev
          })
          setLastPoll(new Date().toISOString())
        }
      } catch {}
    }, 4000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [ticketId, session, lastPoll])

  const fetchTicket = async () => {
    setLoading(true)
    try {
      const result = await getSupportTicket(ticketId)
      if (result.success && result.data) {
        setTicket(result.data)
        setMessages(result.data.messages || [])
        setInternalNotes(result.data.internal_notes || [])
        setLastPoll(new Date().toISOString())
      } else {
        toast.error("Ticket not found")
        router.push("/admin/support")
      }
    } catch {
      toast.error("Failed to load ticket")
      router.push("/admin/support")
    } finally { setLoading(false) }
  }

  const fetchAdminUsers = async () => {
    const result = await getAdminUsers()
    if (result.success) setAdminUsers(result.data || [])
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return
    setSending(true)
    try {
      let attachmentData: any[] = []
      if (attachments.length > 0) {
        setUploading(true)
        try {
          const uploads = await Promise.all(attachments.map(async file => {
            const fd = new FormData(); fd.append("file", file)
            const r = await uploadFileToCloudinary(fd)
            if (!r.success) throw new Error(r.error || "Upload failed")
            return { filename: file.name, original_filename: file.name, file_size: file.size, mime_type: file.type, cloudinary_public_id: r.data!.public_id, cloudinary_url: r.data!.secure_url }
          }))
          attachmentData = uploads
        } finally { setUploading(false) }
      }

      const result = await addSupportMessage(ticketId, { message: newMessage.trim(), attachments: attachmentData })
      if (result.success && result.data) {
        const msg = { ...result.data, sender: result.data.sender || { id: session!.user.id, name: session!.user.name, image: session!.user.image, role: "admin" } }
        setMessages(prev => [...prev, msg])
        setNewMessage("")
        setAttachments([])
        toast.success("Message sent")
      } else { toast.error("Failed to send") }
    } catch { toast.error("Failed to send") }
    finally { setSending(false) }
  }

  const handleSendNote = async () => {
    if (!newNote.trim()) return
    setSending(true)
    try {
      const result = await addInternalNote(ticketId, newNote.trim())
      if (result.success && result.data) {
        const note = { ...result.data, sender: result.data.sender || { id: session!.user.id, name: session!.user.name, image: session!.user.image, role: "admin" } }
        setInternalNotes(prev => [...prev, note])
        setNewNote("")
        toast.success("Note added")
      } else { toast.error("Failed to add note") }
    } catch { toast.error("Failed to add note") }
    finally { setSending(false) }
  }

  const handleUpdateField = async (field: string, value: string) => {
    setUpdating(true)
    try {
      const data: any = {}
      data[field] = value === "unassigned" ? null : value
      const result = await updateSupportTicket(ticketId, data)
      if (result.success) {
        await fetchTicket()
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")} updated`)
      } else { toast.error("Update failed") }
    } catch { toast.error("Update failed") }
    finally { setUpdating(false) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachments(prev => [...prev, ...Array.from(e.target.files || [])])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendNote() }
  }

  if (isPending || loading) return <TicketDetailSkeleton />
  if (!session || (session.user as any)?.role !== "admin" || !ticket) return null

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b bg-background px-4 sm:px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => router.push("/admin/support")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold truncate">{ticket.title}</h1>
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">{ticket.ticket_number}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span className="text-xs text-muted-foreground">Opened {timeAgo(ticket.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTicket}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {ticket.status !== "resolved" && (
                  <DropdownMenuItem onClick={() => handleUpdateField("status", "resolved")}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />Resolve ticket
                  </DropdownMenuItem>
                )}
                {ticket.status !== "closed" && (
                  <DropdownMenuItem onClick={() => handleUpdateField("status", "closed")}>
                    <XCircle className="h-4 w-4 mr-2" />Close ticket
                  </DropdownMenuItem>
                )}
                {(ticket.status === "resolved" || ticket.status === "closed") && (
                  <DropdownMenuItem onClick={() => handleUpdateField("status", "open")}>
                    <CircleDot className="h-4 w-4 mr-2 text-green-500" />Reopen ticket
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleUpdateField("status", "waiting_for_user")}>
                  <Hourglass className="h-4 w-4 mr-2 text-yellow-500" />Mark waiting for user
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateField("status", "in_progress")}>
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />Mark in progress
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content: chat + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={chatTab} onValueChange={(v) => setChatTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 border-b px-4 sm:px-6">
              <TabsList className="h-10 bg-transparent p-0 gap-4">
                <TabsTrigger value="conversation" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2 gap-1.5">
                  <MessageSquare className="h-4 w-4" />Conversation
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{messages.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2 gap-1.5">
                  <Lock className="h-4 w-4" />Internal Notes
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{internalNotes.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="conversation" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>
                    </div>
                  ) : (
                    messages.map(msg => <MessageBubble key={msg.id} message={msg} currentUserId={session.user.id} ticketUserId={ticket.user_id} />)
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message input */}
              {ticket.status !== "closed" && (
                <div className="shrink-0 border-t p-4 sm:px-6 bg-background">
                  <div className="max-w-3xl mx-auto">
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {attachments.map((file, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md text-xs">
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-destructive/10" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder="Type a reply... (Enter to send, Shift+Enter for new line)"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="min-h-[44px] max-h-[160px] resize-none pr-10"
                          disabled={sending || uploading}
                        />
                        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xlsx" />
                        <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button onClick={handleSendMessage} disabled={sending || uploading || (!newMessage.trim() && attachments.length === 0)} className="h-[44px] px-4">
                        {sending || uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {ticket.status === "closed" && (
                <div className="shrink-0 border-t p-4 bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">This ticket is closed. <Button variant="link" className="p-0 h-auto text-sm" onClick={() => handleUpdateField("status", "open")}>Reopen</Button> to continue the conversation.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">Internal notes are only visible to admins. The ticket requester cannot see these.</p>
                  </div>
                  <div className="space-y-3">
                    {internalNotes.length === 0 ? (
                      <div className="text-center py-12">
                        <StickyNote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No internal notes yet.</p>
                      </div>
                    ) : (
                      internalNotes.map(note => (
                        <div key={note.id} className="flex gap-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={note.sender?.image} />
                            <AvatarFallback className="text-[10px]">{note.sender?.name?.[0] || "A"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{note.sender?.name || "Admin"}</span>
                              <span className="text-xs text-muted-foreground">{timeAgo(note.created_at)}</span>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{note.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={notesEndRef} />
                  </div>
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t p-4 sm:px-6 bg-background">
                <div className="max-w-3xl mx-auto flex items-end gap-2">
                  <Textarea
                    placeholder="Add an internal note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={handleNoteKeyDown}
                    className="min-h-[44px] max-h-[120px] resize-none"
                    disabled={sending}
                  />
                  <Button variant="secondary" onClick={handleSendNote} disabled={sending || !newNote.trim()} className="h-[44px] px-4">
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="hidden lg:flex w-[320px] shrink-0 border-l flex-col bg-muted/20">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* Requester */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Requester</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={ticket.user?.image} />
                    <AvatarFallback>{ticket.user?.name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.user?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{ticket.user?.email}</p>
                  </div>
                </div>
                {ticket.organization && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{ticket.organization.name}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Properties */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Properties</h3>
                <div className="space-y-3">
                  <PropertyRow label="Status">
                    <Select value={ticket.status} onValueChange={v => handleUpdateField("status", v)} disabled={updating}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPORT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </PropertyRow>
                  <PropertyRow label="Priority">
                    <Select value={ticket.priority} onValueChange={v => handleUpdateField("priority", v)} disabled={updating}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPORT_PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </PropertyRow>
                  <PropertyRow label="Category">
                    <Select value={ticket.category} onValueChange={v => handleUpdateField("category", v)} disabled={updating}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPORT_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </PropertyRow>
                  <PropertyRow label="Assignee">
                    <Select value={ticket.assigned_to || "unassigned"} onValueChange={v => handleUpdateField("assigned_to", v)} disabled={updating}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {adminUsers.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </PropertyRow>
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Timeline</h3>
                <div className="space-y-3">
                  <TimelineItem icon={<CircleDot className="h-3 w-3 text-green-500" />} label="Created" time={ticket.created_at} />
                  {ticket.assigned_at && <TimelineItem icon={<UserCheck className="h-3 w-3 text-blue-500" />} label={`Assigned to ${ticket.assigned_user?.name || "admin"}`} time={ticket.assigned_at} />}
                  {ticket.resolved_at && <TimelineItem icon={<CheckCircle className="h-3 w-3 text-purple-500" />} label="Resolved" time={ticket.resolved_at} />}
                  {ticket.closed_at && <TimelineItem icon={<XCircle className="h-3 w-3 text-gray-500" />} label="Closed" time={ticket.closed_at} />}
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </div>

              {/* Participants */}
              {ticket.participants?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Participants</h3>
                    <div className="space-y-2">
                      {ticket.participants.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={p.user?.image} />
                            <AvatarFallback className="text-[10px]">{p.user?.name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{p.user?.name}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto capitalize">{p.role}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, currentUserId, ticketUserId }: { message: any; currentUserId: string; ticketUserId: string }) {
  const isSystem = message.message_type === "system"
  const isOwn = message.sender_id === currentUserId
  const isAdmin = message.sender?.role === "admin"

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
          <Info className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{message.message}</p>
          <span className="text-[10px] text-muted-foreground/60">{timeAgo(message.created_at)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={message.sender?.image} />
        <AvatarFallback className={cn("text-xs", isAdmin ? "bg-primary text-primary-foreground" : "bg-muted")}>{message.sender?.name?.[0] || "?"}</AvatarFallback>
      </Avatar>
      <div className={cn("flex-1 max-w-[75%]", isOwn && "flex flex-col items-end")}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">{message.sender?.name || "Unknown"}</span>
          {isAdmin && <Badge variant="secondary" className="text-[10px] h-4 px-1">Staff</Badge>}
          <span className="text-[10px] text-muted-foreground">{timeAgo(message.created_at)}</span>
        </div>
        <div className={cn(
          "p-3 rounded-xl text-sm whitespace-pre-wrap leading-relaxed",
          isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
        )}>
          {message.message}
        </div>

        {/* Attachments */}
        {message.support_attachments?.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.support_attachments.map((att: any) => (
              <a key={att.id} href={att.cloudinary_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border text-xs hover:bg-muted transition-colors group">
                {att.mime_type?.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="truncate flex-1">{att.original_filename || att.filename}</span>
                <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}
        {/* JSON attachments fallback */}
        {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && !message.support_attachments?.length && (
          <div className="mt-2 space-y-1.5">
            {message.attachments.map((att: any, i: number) => (
              <a key={i} href={att.cloudinary_url || att.secure_url || att.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border text-xs hover:bg-muted transition-colors group">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate flex-1">{att.original_filename || att.filename || "Attachment"}</span>
                <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0 w-16">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function TimelineItem({ icon, label, time }: { icon: React.ReactNode; label: string; time: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs">{label}</p>
        <p className="text-[10px] text-muted-foreground">{new Date(time).toLocaleString()}</p>
      </div>
    </div>
  )
}

function TicketDetailSkeleton() {
  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col">
      <div className="shrink-0 border-b p-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <div><Skeleton className="h-5 w-64 mb-1.5" /><Skeleton className="h-4 w-40" /></div>
        </div>
      </div>
      <div className="flex-1 flex">
        <div className="flex-1 p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-16 w-80 rounded-xl" /></div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block w-[320px] border-l p-4 space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  )
}
