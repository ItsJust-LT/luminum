"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageCircle,
  Search,
  Send,
  Phone,
  QrCode,
  Wifi,
  WifiOff,
  Loader2,
  ArrowLeft,
  Settings,
  RefreshCw,
  Check,
  CheckCheck,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface WhatsAppAccount {
  id: string
  organization_id: string
  phone_number: string
  status: string
  qr_code: string | null
  last_error: string | null
  connected_at: string | null
  last_seen_at: string | null
  clientReady: boolean
}

interface WhatsAppChat {
  id: string
  account_id: string
  contact_id: string
  name: string | null
  last_message_at: string | null
  unread_count: number
  is_group: boolean
  messages?: {
    id: string
    body: string | null
    from_me: boolean
    type: string
    timestamp: string
  }[]
}

interface WhatsAppMessage {
  id: string
  chat_id: string
  wa_message_id: string | null
  client_message_id: string | null
  from_me: boolean
  from_number: string | null
  body: string | null
  type: string
  timestamp: string
  ack: number | null
  created_at: string
}

function smartDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (dDate.getTime() === today.getTime()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  }
  if (dDate.getTime() === yesterday.getTime()) {
    return "Yesterday"
  }
  if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString("en-US", { weekday: "short" })
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function messageTime(date: string): string {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function AckIcon({ ack }: { ack: number | null }) {
  if (ack === null || ack === undefined) return null
  if (ack >= 3) return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
  if (ack >= 2) return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
  if (ack >= 1) return <Check className="h-3.5 w-3.5 text-muted-foreground" />
  return <Check className="h-3.5 w-3.5 text-muted-foreground/50" />
}

function ContactAvatar({ name, isGroup }: { name: string | null; isGroup: boolean }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?"
  return (
    <Avatar className="h-10 w-10 flex-shrink-0">
      <AvatarFallback className={cn(
        "text-white font-semibold text-sm",
        isGroup
          ? "bg-gradient-to-br from-emerald-500 to-teal-600"
          : "bg-gradient-to-br from-blue-500 to-indigo-600"
      )}>
        {isGroup ? "#" : initial}
      </AvatarFallback>
    </Avatar>
  )
}

// ── QR Setup Component ──────────────────────────────────────────────────────

function QrSetup({ account, organizationId, onRefresh }: {
  account: WhatsAppAccount | null
  organizationId: string
  onRefresh: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      await api.whatsapp.createAccount(organizationId)
      toast.success("Connecting... Please scan the QR code.")
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to start connection")
    } finally {
      setLoading(false)
    }
  }

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Connect WhatsApp</h2>
            <p className="text-muted-foreground mt-2">
              Link your WhatsApp number to start receiving and sending messages.
            </p>
          </div>
          <Button
            onClick={handleConnect}
            disabled={loading}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
            Connect WhatsApp
          </Button>
        </div>
      </div>
    )
  }

  if (account.status === "QR_PENDING" && account.qr_code) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <QrCode className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Scan QR Code</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Open WhatsApp on your phone, go to Settings &gt; Linked Devices, and scan this code.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl inline-block shadow-md">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(account.qr_code)}`}
              alt="WhatsApp QR Code"
              className="w-64 h-64"
            />
          </div>
          <p className="text-xs text-muted-foreground">QR code refreshes automatically</p>
        </div>
      </div>
    )
  }

  if (account.status === "CONNECTING") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto" />
          <h2 className="text-xl font-bold">Connecting...</h2>
          <p className="text-muted-foreground text-sm">Please wait while we establish the connection.</p>
        </div>
      </div>
    )
  }

  if (account.status === "ERROR") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <WifiOff className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Connection Error</h2>
          <p className="text-muted-foreground text-sm">{account.last_error || "An error occurred."}</p>
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  return null
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const { organization } = useOrganization()
  const { onMessage } = useRealtime()
  const pathname = usePathname()
  const slug = pathname?.split("/")[1] || ""

  const [account, setAccount] = useState<WhatsAppAccount | null>(null)
  const [chats, setChats] = useState<WhatsAppChat[]>([])
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const orgId = organization?.id

  const loadAccount = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await api.whatsapp.getAccount(orgId) as any
      setAccount(res.account || null)
    } catch {
      setAccount(null)
    }
  }, [orgId])

  const loadChats = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await api.whatsapp.getChats(orgId, { search: searchQuery || undefined }) as any
      if (res.success) setChats(res.chats || [])
    } catch {}
  }, [orgId, searchQuery])

  const loadMessages = useCallback(async (chatId: string) => {
    if (!orgId) return
    setMessagesLoading(true)
    try {
      const res = await api.whatsapp.getChat(chatId, orgId) as any
      if (res.success) {
        setMessages(res.messages || [])
        if (res.chat) {
          setSelectedChat(res.chat)
        }
      }
    } catch {} finally {
      setMessagesLoading(false)
    }
  }, [orgId])

  // Initial load
  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    Promise.all([loadAccount(), loadChats()]).finally(() => setLoading(false))
  }, [orgId, loadAccount, loadChats])

  // Poll for account status while connecting/QR pending
  useEffect(() => {
    if (!account || (account.status !== "QR_PENDING" && account.status !== "CONNECTING")) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      return
    }
    pollTimerRef.current = setInterval(loadAccount, 3000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [account?.status, loadAccount])

  // When account becomes connected, load chats
  useEffect(() => {
    if (account?.status === "CONNECTED") {
      loadChats()
    }
  }, [account?.status, loadChats])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Real-time message handling
  useEffect(() => {
    const unsub = onMessage("whatsapp:message", (data: any) => {
      if (data?.chatId && data?.message) {
        // Add to messages if viewing this chat
        if (selectedChat?.id === data.chatId) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === data.message.id)
            if (exists) return prev
            return [...prev, data.message]
          })
        }
        // Update chat list
        if (data.chat) {
          setChats((prev) => {
            const idx = prev.findIndex((c) => c.id === data.chatId)
            const updated = data.chat
            if (idx >= 0) {
              const copy = [...prev]
              copy[idx] = { ...copy[idx], ...updated }
              return copy.sort((a, b) => {
                const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
                const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
                return bTime - aTime
              })
            }
            return [updated, ...prev]
          })
        }
      }

      // Handle ack updates
      if (data?.messageId && data?.ack !== undefined) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, ack: data.ack } : m
          )
        )
      }
    })
    return unsub
  }, [onMessage, selectedChat?.id])

  // Real-time status handling
  useEffect(() => {
    const unsub = onMessage("whatsapp:status", (data: any) => {
      if (data?.status === "connected") {
        loadAccount()
        loadChats()
        toast.success("WhatsApp connected!")
      } else if (data?.status === "disconnected") {
        loadAccount()
        toast.error("WhatsApp disconnected")
      } else if (data?.status === "qr_pending") {
        loadAccount()
      }
    })
    return unsub
  }, [onMessage, loadAccount, loadChats])

  const handleSelectChat = async (chat: WhatsAppChat) => {
    setSelectedChat(chat)
    await loadMessages(chat.id)

    // Mark as read
    if (chat.unread_count > 0 && orgId) {
      try {
        await api.whatsapp.markChatRead(chat.id, orgId)
        setChats((prev) =>
          prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
        )
      } catch {}
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !orgId) return

    const body = messageInput.trim()
    setMessageInput("")
    setSending(true)

    const tempId = `temp-${Date.now()}`
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      chat_id: selectedChat.id,
      wa_message_id: null,
      client_message_id: tempId,
      from_me: true,
      from_number: null,
      body,
      type: "text",
      timestamp: new Date().toISOString(),
      ack: 0,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await api.whatsapp.sendMessage(selectedChat.id, body, orgId, tempId) as any
      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.message : m))
        )
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message")
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setMessageInput(body)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <div className="w-80 border-r p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Not connected — show setup
  if (!account || account.status !== "CONNECTED") {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <QrSetup account={account} organizationId={orgId!} onRefresh={loadAccount} />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Chat List (left panel) ────────────────────────────────────── */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r flex flex-col bg-background",
        selectedChat ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="p-3 border-b flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="pl-9 h-9 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Link href={`/${slug}/whatsapp/settings`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Connection status */}
        <div className="px-3 py-1.5 flex items-center gap-2 border-b bg-green-50/50 dark:bg-green-950/20">
          <Wifi className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">
            Connected{account.phone_number ? ` · ${account.phone_number}` : ""}
          </span>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No chats yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Messages will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {chats.map((chat) => {
                const lastMsg = chat.messages?.[0]
                const isActive = selectedChat?.id === chat.id
                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
                      isActive && "bg-muted/70"
                    )}
                  >
                    <ContactAvatar name={chat.name} isGroup={chat.is_group} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {chat.name || chat.contact_id}
                        </span>
                        {chat.last_message_at && (
                          <span className={cn(
                            "text-xs flex-shrink-0",
                            chat.unread_count > 0 ? "text-green-600 font-medium" : "text-muted-foreground"
                          )}>
                            {smartDate(chat.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate flex-1">
                          {lastMsg?.from_me && <span className="text-muted-foreground/70">You: </span>}
                          {lastMsg?.body || (lastMsg?.type !== "text" ? `[${lastMsg?.type}]` : "No messages")}
                        </p>
                        {chat.unread_count > 0 && (
                          <Badge className="bg-green-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 rounded-full flex-shrink-0">
                            {chat.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Chat Detail (right panel) ─────────────────────────────────── */}
      {selectedChat ? (
        <div className={cn(
          "flex-1 flex flex-col bg-background",
          selectedChat ? "flex" : "hidden md:flex"
        )}>
          {/* Chat header */}
          <div className="h-14 px-4 border-b flex items-center gap-3 bg-background/95 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSelectedChat(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <ContactAvatar name={selectedChat.name} isGroup={selectedChat.is_group} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedChat.name || selectedChat.contact_id}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedChat.is_group ? "Group" : selectedChat.contact_id}
              </p>
            </div>
          </div>

          {/* Messages area */}
          <ScrollArea className="flex-1 px-4 py-3">
            {messagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.from_me ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm",
                        msg.from_me
                          ? "bg-green-500 text-white rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      )}
                    >
                      {msg.from_number && !msg.from_me && (
                        <p className="text-xs font-semibold text-green-600 mb-0.5">
                          {msg.from_number}
                        </p>
                      )}
                      {msg.type !== "text" && msg.type !== "chat" && !msg.body && (
                        <p className="text-xs italic opacity-80">[{msg.type}]</p>
                      )}
                      {msg.body && (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      )}
                      <div className={cn(
                        "flex items-center gap-1 mt-0.5",
                        msg.from_me ? "justify-end" : "justify-start"
                      )}>
                        <span className={cn(
                          "text-[10px]",
                          msg.from_me ? "text-white/70" : "text-muted-foreground"
                        )}>
                          {messageTime(msg.timestamp)}
                        </span>
                        {msg.from_me && <AckIcon ack={msg.ack} />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message input */}
          <div className="p-3 border-t bg-background">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage() }}
              className="flex items-center gap-2 max-w-3xl mx-auto"
            >
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 rounded-full h-10"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!messageInput.trim() || sending}
                className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        /* Empty state when no chat selected (desktop) */
        <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">Select a chat to start messaging</p>
            <p className="text-xs text-muted-foreground/70">Choose from your conversations on the left</p>
          </div>
        </div>
      )}
    </div>
  )
}
