"use client"

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  ImagePlus,
  X,
  Info,
  Reply,
  Forward,
  Star,
  Trash2,
  SmilePlus,
  MoreVertical,
  Pin,
  Archive,
  BellOff,
  Bell,
  Eye,
  Copy,
  Users,
  Download,
  ExternalLink,
  FileText,
  Music2,
  Film,
  Image as ImageIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useWhatsAppCache } from "@/lib/contexts/whatsapp-context"

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
  is_archived?: boolean
  is_muted?: boolean
  is_pinned?: boolean
  display_name?: string | null
  profile_picture_url?: string | null
  messages?: {
    id: string
    body: string | null
    from_me: boolean
    type: string
    media_url?: string | null
    mime_type?: string | null
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
  sender_display_name?: string | null
  body: string | null
  type: string
  media_url?: string | null
  mime_type?: string | null
  quoted_wa_message_id?: string | null
  quoted_body?: string | null
  quoted_from?: string | null
  is_starred?: boolean
  is_pinned?: boolean
  is_deleted?: boolean
  reactions?: { emoji: string; senderId: string }[] | null
  timestamp: string
  ack: number | null
  created_at: string
}

interface LinkPreview {
  url: string
  title?: string | null
  description?: string | null
  image?: string | null
  siteName?: string | null
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

function messageTime(date: string | Date): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function AckIcon({ ack }: { ack: number | null }) {
  if (ack === null || ack === undefined) return null
  const label =
    ack >= 4 ? "Played"
    : ack >= 3 ? "Read"
    : ack >= 2 ? "Delivered to their device"
    : ack >= 1 ? "Sent to WhatsApp"
    : "Sending…"
  let icon: ReactNode
  if (ack >= 4) {
    icon = <CheckCheck className="h-3.5 w-3.5 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.45)]" />
  } else if (ack >= 3) {
    icon = <CheckCheck className="h-3.5 w-3.5 text-[#5bd0ff] drop-shadow-[0_0_5px_rgba(91,208,255,0.35)]" />
  } else if (ack >= 2) {
    icon = <CheckCheck className="h-3.5 w-3.5 text-white/85" />
  } else if (ack >= 1) {
    icon = <Check className="h-3.5 w-3.5 text-white/75" />
  } else {
    icon = <Check className="h-3.5 w-3.5 text-white/45 animate-pulse" />
  }
  return (
    <span title={label} aria-label={label} className="inline-flex items-center transition-all duration-300">
      {icon}
    </span>
  )
}

/** WhatsApp JID for API calls — list rows should expose contact_id, but always fall back to id. */
function whatsappChatJid(chat: Pick<WhatsAppChat, "id" | "contact_id">): string {
  const c = chat.contact_id?.trim()
  return c || chat.id
}

/** Format chat for display: use name if set, else friendly fallback from contact_id (e.g. +1234567890 or "Group"). */
function formatChatDisplayName(chat: { name: string | null; contact_id: string; is_group: boolean }): string {
  if (chat.name?.trim()) return chat.name.trim()
  if (chat.is_group) return "Group"
  return formatContactIdAsNumber(chat.contact_id)
}

function dedupeMessages(items: WhatsAppMessage[]): WhatsAppMessage[] {
  const out: WhatsAppMessage[] = []
  for (const m of items) {
    const exists = out.some((x) =>
      x.id === m.id ||
      (!!x.wa_message_id && !!m.wa_message_id && x.wa_message_id === m.wa_message_id) ||
      (!!x.client_message_id && !!m.client_message_id && x.client_message_id === m.client_message_id)
    )
    if (!exists) out.push(m)
  }
  return out
}

function extractFirstUrl(text?: string | null): string | null {
  if (!text) return null
  const match = /(https?:\/\/[^\s<>"')]+)/i.exec(text)
  return match?.[1] || null
}

function mediaLabel(type?: string | null): string {
  const t = (type || "").toLowerCase()
  if (t === "image") return "Image"
  if (t === "audio" || t === "ptt") return "Voice message"
  if (t === "video") return "Video"
  if (t === "document") return "Document"
  if (t === "sticker") return "Sticker"
  return "Media"
}

function renderMediaContent(msg: WhatsAppMessage, fromMe: boolean) {
  if (!msg.media_url) return null
  const mime = (msg.mime_type || "").toLowerCase()
  const shellClass = cn(
    "mt-2 overflow-hidden rounded-xl border backdrop-blur-sm",
    fromMe ? "border-white/30 bg-white/10" : "border-border/80 bg-background/80"
  )

  if (mime.startsWith("image/")) {
    return (
      <div className={shellClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={msg.media_url} alt="Image attachment" className="max-h-[340px] w-auto max-w-full object-contain" />
      </div>
    )
  }

  if (mime.startsWith("video/")) {
    return (
      <div className={shellClass}>
        <video controls preload="metadata" className="max-h-[340px] w-full bg-black/80">
          <source src={msg.media_url} type={msg.mime_type || undefined} />
        </video>
      </div>
    )
  }

  if (mime.startsWith("audio/")) {
    return (
      <div className={cn(shellClass, "p-2")}>
        <div className="mb-2 flex items-center gap-2 text-xs opacity-80">
          <Music2 className="h-3.5 w-3.5" />
          Audio attachment
        </div>
        <audio controls preload="metadata" className="w-full min-w-[230px]">
          <source src={msg.media_url} type={msg.mime_type || undefined} />
        </audio>
      </div>
    )
  }

  const label = mime.startsWith("application/")
    ? "Document"
    : mime.includes("pdf")
      ? "PDF"
      : "File attachment"

  return (
    <div className={cn(shellClass, "p-3")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            {label}
          </p>
          <p className={cn("truncate text-[11px]", fromMe ? "text-white/80" : "text-muted-foreground")}>
            {msg.mime_type || "Unknown type"}
          </p>
        </div>
        <a
          href={msg.media_url}
          download
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            fromMe ? "bg-white/20 text-white hover:bg-white/30" : "bg-muted hover:bg-muted/80"
          )}
        >
          <Download className="h-3.5 w-3.5" />
          Open
        </a>
      </div>
    </div>
  )
}

/** Format contact_id (e.g. 1234567890@s.whatsapp.net) as +1234567890 for display. Status/lid IDs show as Status. */
function formatContactIdAsNumber(contactId: string): string {
  if (!contactId) return "Unknown"
  const lower = contactId.toLowerCase()
  if (lower.includes("@lid") || lower.includes("status")) return "Status"
  const at = contactId.indexOf("@")
  const local = at > 0 ? contactId.slice(0, at) : contactId
  const digits = local.replace(/\D/g, "")
  if (digits.length >= 6) return `+${digits}`
  return local || "Unknown"
}

/** Same-origin image URL — session cookie is forwarded by the dashboard route to the API. */
function whatsappAvatarSrc(organizationId: string | undefined, contactId: string | undefined): string | undefined {
  if (!organizationId || !contactId) return undefined
  if (contactId.toLowerCase().includes("@lid")) return undefined
  return `/api/whatsapp-profile?organizationId=${encodeURIComponent(organizationId)}&jid=${encodeURIComponent(contactId)}`
}

/** Label for a message date (Today, Yesterday, or formatted with year when different). */
function messageDateLabel(dateStr: string | Date): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dDate.getTime() === today.getTime()) return "Today"
  if (dDate.getTime() === yesterday.getTime()) return "Yesterday"
  if (d.getFullYear() !== now.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

function ContactAvatar({
  displayName,
  isGroup,
  photoUrl,
  avatarSrc,
}: {
  displayName: string
  isGroup: boolean
  photoUrl?: string | null
  /** Prefer same-origin proxy so avatars load with auth and avoid CDN hotlink issues. */
  avatarSrc?: string | null
}) {
  const initial = isGroup ? "#" : (displayName.charAt(0).match(/\d/) ? displayName.replace(/\D/g, "").charAt(0) || "?" : displayName.charAt(0).toUpperCase())
  const src = (avatarSrc && avatarSrc.trim()) || (photoUrl && photoUrl.trim()) || undefined
  return (
    <Avatar className="h-10 w-10 flex-shrink-0">
      <AvatarImage src={src || undefined} alt={displayName} className="object-cover" referrerPolicy="no-referrer" />
      <AvatarFallback className={cn(
        "text-white font-semibold text-sm",
        isGroup
          ? "bg-gradient-to-br from-emerald-500 to-teal-600"
          : "bg-gradient-to-br from-blue-500 to-indigo-600"
      )}>
        {initial || "?"}
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

  const handleReconnect = async () => {
    setLoading(true)
    try {
      await api.whatsapp.reconnect(organizationId)
      toast.success("Reconnecting… A new QR code will appear shortly.")
      onRefresh()
    } catch (err: any) {
      toast.error((err as any)?.message || "Reconnect failed")
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

  // QR code expired or not ready (e.g. stale after 5 min, or client not emitting)
  if (account.status === "QR_PENDING" && !account.qr_code) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <RefreshCw className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">QR code expired or not ready</h2>
            <p className="text-muted-foreground text-sm mt-1">
              The previous QR code is no longer valid. Click below to get a new one, then scan it with WhatsApp.
            </p>
          </div>
          <Button
            onClick={handleReconnect}
            disabled={loading}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Get new QR code
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onRefresh()
              toast.info("Checking connection status…")
            }}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            I've scanned — check status
          </Button>
        </div>
      </div>
    )
  }

  if (account.status === "CONNECTING") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-5 max-w-md px-4">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-bold">Connecting...</h2>
            <p className="text-muted-foreground text-sm mt-1">Please wait while we establish the connection.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => { onRefresh(); toast.info("Checking status…") }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check status
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReconnect}
              disabled={loading}
              className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Link removed? Get new QR code
            </Button>
          </div>
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
          <Button onClick={handleReconnect} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  // DISCONNECTED or any other status: show reconnect so we never render nothing
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <MessageCircle className="h-10 w-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reconnect WhatsApp</h2>
          <p className="text-muted-foreground mt-2">
            The connection is not active. Click below to generate a new QR code and link your number again.
          </p>
        </div>
        <Button
          onClick={handleReconnect}
          disabled={loading}
          size="lg"
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Reconnect WhatsApp
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const { organization } = useOrganization()
  const { onMessage } = useRealtime()
  const pathname = usePathname()
  const router = useRouter()
  const slug = pathname?.split("/")[1] || ""

  const [whatsappAccessChecked, setWhatsappAccessChecked] = useState(false)
  const [whatsappAccess, setWhatsappAccess] = useState<boolean | null>(null)
  const [account, setAccount] = useState<WhatsAppAccount | null>(null)
  const [chats, setChats] = useState<WhatsAppChat[]>([])
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; fileName: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [linkPreviewCache, setLinkPreviewCache] = useState<Record<string, LinkPreview | null>>({})
  const [replyingTo, setReplyingTo] = useState<WhatsAppMessage | null>(null)
  const [forwardModalOpen, setForwardModalOpen] = useState(false)
  const [forwardingMessage, setForwardingMessage] = useState<WhatsAppMessage | null>(null)
  const [messageInfoOpen, setMessageInfoOpen] = useState(false)
  const [messageInfoData, setMessageInfoData] = useState<any>(null)
  const [messageInfoLoading, setMessageInfoLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  /** Skip auto-scroll to bottom once after prepending older messages (preserve scroll position). */
  const skipAutoScrollOnceRef = useRef(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chatsRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadingOlderRef = useRef(false)
  const hydratedPreviewRef = useRef<Set<string>>(new Set())
  const {
    selectedChatId: cachedSelectedChatId,
    setSelectedChatId: setCachedSelectedChatId,
    chatListCache,
    setChatListCache,
    chatStateById,
    setChatStateById,
  } = useWhatsAppCache()

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
      if (res.success) {
        const items = res.chats || []
        setChats(items)
        setChatListCache(items)
      }
    } catch {}
  }, [orgId, searchQuery, setChatListCache])

  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [historySyncedHint, setHistorySyncedHint] = useState(false)

  const loadMessages = useCallback(async (chatId: string, cursor?: string) => {
    if (!orgId) return
    if (cursor) {
      skipAutoScrollOnceRef.current = true
      setLoadingOlder(true)
    } else {
      setMessagesLoading(true)
    }
    try {
      const res = await api.whatsapp.getChat(chatId, orgId, { limit: 120, cursor }) as any
      if (res.success) {
        const list = Array.isArray(res.messages) ? res.messages : []
        if (!cursor) setHistorySyncedHint(!!res.historyBackfilled)
        if (cursor) {
          setMessages((prev) => {
            const next = dedupeMessages([...list, ...prev])
            setChatStateById((s) => ({
              ...s,
              [chatId]: { messages: next, nextCursor: res.nextCursor ?? null, hasLoaded: true },
            }))
            return next
          })
        } else {
          const next = dedupeMessages(list)
          setMessages(next)
          setChatStateById((s) => ({
            ...s,
            [chatId]: { messages: next, nextCursor: res.nextCursor ?? null, hasLoaded: true },
          }))
        }
        setNextCursor(res.nextCursor ?? null)
        if (res.chat) setSelectedChat((prev) => (prev ? { ...prev, ...res.chat } : res.chat))
      }
    } catch {} finally {
      if (cursor) setLoadingOlder(false)
      else setMessagesLoading(false)
    }
  }, [orgId, setChatStateById])

  // Route guard: fetch WhatsApp access from API so direct URL access is blocked when disabled
  useEffect(() => {
    if (!orgId) return
    setWhatsappAccessChecked(false)
    api.whatsapp.checkEnabled(orgId)
      .then((r: any) => {
        setWhatsappAccess(!!r?.enabled)
        setWhatsappAccessChecked(true)
      })
      .catch(() => {
        setWhatsappAccess(false)
        setWhatsappAccessChecked(true)
      })
  }, [orgId])

  // Initial load (only when access granted)
  useEffect(() => {
    if (!orgId || whatsappAccess !== true) return
    setLoading(true)
    Promise.all([loadAccount(), loadChats()]).finally(() => setLoading(false))
  }, [orgId, whatsappAccess, loadAccount, loadChats])

  // Restore cached chat list quickly to avoid constant reload feel.
  useEffect(() => {
    if (chatListCache.length > 0 && chats.length === 0) {
      setChats(chatListCache as WhatsAppChat[])
    }
  }, [chatListCache, chats.length])

  // Poll for account status while connecting/QR pending
  useEffect(() => {
    if (!account || (account.status !== "QR_PENDING" && account.status !== "CONNECTING")) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      return
    }
    pollTimerRef.current = setInterval(loadAccount, 2000)
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

  // Light polling while connected — covers missed WS deliveries and races with new contacts.
  useEffect(() => {
    if (account?.status !== "CONNECTED" || !orgId || whatsappAccess !== true) {
      if (chatsRefreshRef.current) {
        clearInterval(chatsRefreshRef.current)
        chatsRefreshRef.current = null
      }
      return
    }
    chatsRefreshRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      loadChats()
    }, 25_000)
    return () => {
      if (chatsRefreshRef.current) {
        clearInterval(chatsRefreshRef.current)
        chatsRefreshRef.current = null
      }
    }
  }, [account?.status, orgId, whatsappAccess, loadChats])

  // Scroll to bottom when messages change (not when older messages were just prepended)
  useEffect(() => {
    if (skipAutoScrollOnceRef.current) {
      skipAutoScrollOnceRef.current = false
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Lazy load OG metadata for links present in messages.
  useEffect(() => {
    if (!orgId) return
    const urls = [...new Set(messages.map((m) => extractFirstUrl(m.body)).filter(Boolean) as string[])]
    urls.forEach((url) => {
      if (linkPreviewCache[url] !== undefined) return
      setLinkPreviewCache((prev) => ({ ...prev, [url]: null }))
      api.whatsapp.getLinkPreview(orgId, url)
        .then((res: any) => {
          setLinkPreviewCache((prev) => ({
            ...prev,
            [url]: res?.success ? (res?.preview ?? null) : null,
          }))
        })
        .catch(() => {
          setLinkPreviewCache((prev) => ({ ...prev, [url]: null }))
        })
    })
  }, [messages, orgId, linkPreviewCache])

  // Real-time message handling
  useEffect(() => {
    const unsub = onMessage("whatsapp:message", (data: any) => {
      if (data?.chatId && data?.message) {
        // Add to messages if viewing this chat
        if (selectedChat?.id === data.chatId) {
          setMessages((prev) => {
            const next = dedupeMessages([...prev, data.message])
            setChatStateById((s) => ({
              ...s,
              [data.chatId]: {
                messages: next,
                nextCursor: s[data.chatId]?.nextCursor ?? nextCursor,
                hasLoaded: true,
              },
            }))
            return next
          })
        }
        // Update chat list
        setChats((prev) => {
          const idx = prev.findIndex((c) => c.id === data.chatId)
          const base = idx >= 0 ? prev[idx] : null
          const merged = {
            ...(base || {}),
            ...(data.chat || {}),
            id: data.chatId,
            last_message_at: data.message?.timestamp || data.chat?.last_message_at || base?.last_message_at || new Date().toISOString(),
            messages: [{
              id: data.message.id,
              body: data.message.body,
              from_me: data.message.from_me,
              type: data.message.type,
              media_url: data.message.media_url ?? null,
              mime_type: data.message.mime_type ?? null,
              timestamp: data.message.timestamp,
            }],
            unread_count: selectedChat?.id === data.chatId
              ? 0
              : Math.max(0, (base?.unread_count || 0) + (data.message.from_me ? 0 : 1)),
          } as WhatsAppChat
          const next = idx >= 0
            ? prev.map((c, i) => (i === idx ? merged : c))
            : [merged, ...prev]
          const sorted = next.sort((a, b) => {
            const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
            const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
            return bTime - aTime
          })
          setChatListCache(sorted)
          return sorted
        })
      }

      // Handle ack updates (id matches Redis message id / wa_message_id)
      if (data?.messageId != null && data?.ack !== undefined && data?.message == null) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId || m.wa_message_id === data.messageId ? { ...m, ack: data.ack } : m
          )
        )
      }
    })
    return unsub
  }, [onMessage, selectedChat?.id, nextCursor, setChatStateById, setChatListCache])

  // Real-time reaction handling
  useEffect(() => {
    const unsub = onMessage("whatsapp:reaction", (data: any) => {
      if (data?.messageId && data?.reactions !== undefined) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, reactions: data.reactions } : m
          )
        )
      }
    })
    return unsub
  }, [onMessage])

  // Real-time status handling (WebSocket may not reach this client in multi-instance setups; polling + "Check status" button are fallbacks)
  useEffect(() => {
    const unsub = onMessage("whatsapp:status", (data: any) => {
      if (data?.status === "connected") {
        loadAccount().then(() => {
          loadChats()
          toast.success("WhatsApp connected!")
        })
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
    const jid = whatsappChatJid(chat)
    const normalized = { ...chat, id: jid, contact_id: chat.contact_id?.trim() || jid }
    setSelectedChat(normalized)
    setCachedSelectedChatId(jid)
    setHistorySyncedHint(false)

    const cached = chatStateById[jid]
    if (cached?.hasLoaded) {
      setMessages(cached.messages)
      setNextCursor(cached.nextCursor)
    } else {
      await loadMessages(jid)
    }

    // Mark as read
    if (chat.unread_count > 0 && orgId) {
      try {
        await api.whatsapp.markChatRead(jid, orgId)
        setChats((prev) =>
          prev.map((c) => (whatsappChatJid(c) === jid ? { ...c, unread_count: 0 } : c))
        )
      } catch {}
    }
  }

  useEffect(() => {
    if (!cachedSelectedChatId || !chats.length || selectedChat) return
    const chat = chats.find((c) => whatsappChatJid(c) === cachedSelectedChatId)
    if (chat) {
      const jid = whatsappChatJid(chat)
      setSelectedChat({ ...chat, id: jid, contact_id: chat.contact_id?.trim() || jid })
      const cached = chatStateById[jid]
      if (cached?.hasLoaded) {
        setMessages(cached.messages)
        setNextCursor(cached.nextCursor)
      }
    }
  }, [cachedSelectedChatId, chats, selectedChat, chatStateById])

  // Lazy hydrate previews for chats that currently show "No messages yet".
  useEffect(() => {
    if (!orgId || chats.length === 0) return
    const targets = chats.filter((c) => !c.messages?.length).slice(0, 8)
    targets.forEach((chat, i) => {
      const jid = whatsappChatJid(chat)
      if (hydratedPreviewRef.current.has(jid)) return
      hydratedPreviewRef.current.add(jid)
      setTimeout(async () => {
        try {
          const res = await api.whatsapp.getChat(jid, orgId, { limit: 1 }) as any
          const latest = Array.isArray(res?.messages) && res.messages.length > 0 ? res.messages[res.messages.length - 1] : null
          if (!latest) return
          setChats((prev) => prev.map((c) => whatsappChatJid(c) === jid ? {
            ...c,
            last_message_at: latest.timestamp || c.last_message_at,
            messages: [{
              id: latest.id,
              body: latest.body,
              from_me: latest.from_me,
              type: latest.type,
              media_url: latest.media_url ?? null,
              mime_type: latest.mime_type ?? null,
              timestamp: latest.timestamp,
            }],
          } : c))
        } catch {
          // ignore
        }
      }, i * 200)
    })
  }, [orgId, chats])

  const handleMessagesScroll = useCallback(async (e: React.UIEvent<HTMLDivElement>) => {
    if (!selectedChat || !nextCursor || messagesLoading || loadingOlder || loadingOlderRef.current) return
    const el = e.currentTarget
    if (el.scrollTop > 120) return
    loadingOlderRef.current = true
    const prevHeight = el.scrollHeight
    await loadMessages(selectedChat.id, nextCursor)
    requestAnimationFrame(() => {
      const newHeight = el.scrollHeight
      el.scrollTop = Math.max(0, newHeight - prevHeight + el.scrollTop)
      loadingOlderRef.current = false
    })
  }, [selectedChat, nextCursor, messagesLoading, loadingOlder, loadMessages])

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !selectedImage) || !selectedChat || !orgId) return

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
      type: selectedImage ? "image" : "text",
      media_url: selectedImage?.dataUrl ?? null,
      mime_type: selectedImage ? "image/*" : null,
      quoted_wa_message_id: replyingTo?.wa_message_id ?? null,
      quoted_body: replyingTo?.body?.slice(0, 200) ?? null,
      quoted_from: replyingTo?.from_number ?? null,
      timestamp: new Date().toISOString(),
      ack: 0,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => dedupeMessages([...prev, optimisticMsg]))

    const quotedWaId = replyingTo?.wa_message_id || undefined
    setReplyingTo(null)

    try {
      const res = selectedImage
        ? await api.whatsapp.sendMediaMessage(selectedChat.id, selectedImage.dataUrl, orgId, body || undefined, tempId) as any
        : await api.whatsapp.sendMessage(selectedChat.id, body, orgId, tempId, quotedWaId) as any
      if (res.success && res.message) {
        setMessages((prev) => dedupeMessages(prev.map((m) => (m.id === tempId ? res.message : m))))
      }
      setSelectedImage(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to send message")
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setMessageInput(body)
    } finally {
      setSending(false)
    }
  }

  const handleReply = (msg: WhatsAppMessage) => {
    setReplyingTo(msg)
  }

  const handleReact = async (msg: WhatsAppMessage, emoji: string) => {
    if (!orgId || !msg.wa_message_id) return
    try {
      await api.whatsapp.reactToMessage(msg.wa_message_id, orgId, emoji)
    } catch (err: any) {
      toast.error(err.message || "Failed to react")
    }
  }

  const handleStar = async (msg: WhatsAppMessage) => {
    if (!orgId || !msg.wa_message_id) return
    try {
      await api.whatsapp.starMessage(msg.wa_message_id, orgId, !msg.is_starred)
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_starred: !msg.is_starred } : m))
      toast.success(msg.is_starred ? "Unstarred" : "Starred")
    } catch (err: any) {
      toast.error(err.message || "Failed to star message")
    }
  }

  const handleDelete = async (msg: WhatsAppMessage, everyone: boolean) => {
    if (!orgId || !msg.wa_message_id) return
    try {
      await api.whatsapp.deleteMessage(msg.wa_message_id, orgId, everyone)
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_deleted: true, body: null } : m))
      toast.success("Message deleted")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete message")
    }
  }

  const handleForward = (msg: WhatsAppMessage) => {
    setForwardingMessage(msg)
    setForwardModalOpen(true)
  }

  const handleForwardConfirm = async (targetChatIds: string[]) => {
    if (!orgId || !forwardingMessage?.wa_message_id) return
    try {
      await api.whatsapp.forwardMessage(forwardingMessage.wa_message_id, orgId, targetChatIds)
      toast.success(`Forwarded to ${targetChatIds.length} chat${targetChatIds.length > 1 ? "s" : ""}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to forward")
    }
    setForwardModalOpen(false)
    setForwardingMessage(null)
  }

  const handleCopyMessage = (msg: WhatsAppMessage) => {
    if (msg.body) {
      navigator.clipboard.writeText(msg.body)
      toast.success("Copied to clipboard")
    }
  }

  const handleMessageInfo = async (msg: WhatsAppMessage) => {
    if (!orgId || !msg.wa_message_id) return
    setMessageInfoLoading(true)
    setMessageInfoOpen(true)
    try {
      const res = await api.whatsapp.getMessageInfo(msg.wa_message_id, orgId) as any
      setMessageInfoData(res?.info || null)
    } catch {
      setMessageInfoData(null)
    } finally {
      setMessageInfoLoading(false)
    }
  }

  const handleArchiveChat = async (chat: WhatsAppChat, archive: boolean) => {
    if (!orgId) return
    try {
      await api.whatsapp.archiveChat(chat.id, orgId, archive)
      setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, is_archived: archive } : c))
      toast.success(archive ? "Chat archived" : "Chat unarchived")
    } catch (err: any) {
      toast.error(err.message || "Failed")
    }
  }

  const handlePinChat = async (chat: WhatsAppChat, pin: boolean) => {
    if (!orgId) return
    try {
      await api.whatsapp.pinChat(chat.id, orgId, pin)
      setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, is_pinned: pin } : c))
      toast.success(pin ? "Chat pinned" : "Chat unpinned")
    } catch (err: any) {
      toast.error(err.message || "Failed")
    }
  }

  const handleMuteChat = async (chat: WhatsAppChat, mute: boolean) => {
    if (!orgId) return
    try {
      await api.whatsapp.muteChat(chat.id, orgId, mute)
      setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, is_muted: mute } : c))
      toast.success(mute ? "Chat muted" : "Chat unmuted")
    } catch (err: any) {
      toast.error(err.message || "Failed")
    }
  }

  if (!organization) return null

  // Route guard: WhatsApp not enabled (direct URL access blocked)
  if (whatsappAccessChecked && whatsappAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">WhatsApp not enabled</h3>
          <p className="text-muted-foreground mb-4">
            WhatsApp is not enabled for this organization. Contact an administrator if you need access.
          </p>
          <Button onClick={() => router.push(`/${slug}/dashboard`)} variant="outline" className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Wait for access check
  if (!whatsappAccessChecked || whatsappAccess !== true) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
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

  // Not connected — show setup (Settings always reachable)
  if (!account || account.status !== "CONNECTED") {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        <div className="flex items-center justify-end border-b px-3 py-2">
          <Link href={`/${slug}/whatsapp/settings`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="flex-1 min-h-0 flex">
          <QrSetup account={account} organizationId={orgId!} onRefresh={loadAccount} />
        </div>
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
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 h-full min-h-0">
          {chats.filter((c) => !c.contact_id?.toLowerCase().includes("@lid")).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No chats yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Messages will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {chats.filter((c) => !c.contact_id?.toLowerCase().includes("@lid")).map((chat) => {
                const lastMsg = chat.messages?.[0]
                const isActive = selectedChat != null && whatsappChatJid(chat) === selectedChat.id
                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
                      isActive && "bg-muted/70"
                    )}
                  >
                    <ContactAvatar
                      displayName={chat.display_name || formatChatDisplayName(chat)}
                      isGroup={chat.is_group}
                      photoUrl={chat.profile_picture_url}
                      avatarSrc={whatsappAvatarSrc(orgId, chat.contact_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate inline-flex items-center gap-1.5 min-w-0">
                          {chat.is_group && (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 shrink-0">
                              <Users className="h-3 w-3" aria-hidden />
                              Group
                            </span>
                          )}
                          <span className="truncate">{chat.display_name || formatChatDisplayName(chat)}</span>
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
                          {lastMsg ? (
                            <>
                              {lastMsg.from_me && <span className="text-muted-foreground/70">You: </span>}
                              {(lastMsg.body != null && lastMsg.body !== ""
                                ? lastMsg.body
                                : (lastMsg.media_url || (lastMsg.type && lastMsg.type !== "text"))
                                  ? mediaLabel(lastMsg.type)
                                  : "No messages")}
                            </>
                          ) : (
                            <span className="italic">No messages yet</span>
                          )}
                        </p>
                        {chat.is_pinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        {chat.is_muted && <BellOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
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
            <ContactAvatar
              displayName={selectedChat.display_name || formatChatDisplayName(selectedChat)}
              isGroup={selectedChat.is_group}
              photoUrl={selectedChat.profile_picture_url}
              avatarSrc={whatsappAvatarSrc(orgId, selectedChat.contact_id)}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedChat.display_name || formatChatDisplayName(selectedChat)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedChat.is_group ? "Group" : (selectedChat.name ? formatContactIdAsNumber(selectedChat.contact_id) : null)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleArchiveChat(selectedChat, !selectedChat.is_archived)}>
                  <Archive className="h-4 w-4 mr-2" />{selectedChat.is_archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePinChat(selectedChat, !selectedChat.is_pinned)}>
                  <Pin className="h-4 w-4 mr-2" />{selectedChat.is_pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMuteChat(selectedChat, !selectedChat.is_muted)}>
                  {selectedChat.is_muted ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                  {selectedChat.is_muted ? "Unmute" : "Mute"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {selectedChat.is_group && (
                  <DropdownMenuItem asChild>
                    <Link href={`/${slug}/whatsapp/groups/${encodeURIComponent(selectedChat.id)}`}>
                      <Users className="h-4 w-4 mr-2" />Group info
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/${slug}/whatsapp/contacts/${encodeURIComponent(selectedChat.id)}`}>
                    <Info className="h-4 w-4 mr-2" />Contact info
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Messages area */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div
              ref={messagesScrollRef}
              className="flex-1 h-full min-h-0 overflow-auto bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_45%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.08),transparent_45%)] px-4 py-3"
              onScroll={handleMessagesScroll}
            >
            {messagesLoading && messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-w-3xl mx-auto pb-4">
                {historySyncedHint && (
                  <div
                    role="status"
                    className="mb-1 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.11] px-3 py-2.5 text-xs text-emerald-950 dark:text-emerald-100 animate-in fade-in slide-in-from-top-1 duration-300"
                  >
                    <span className="leading-snug">
                      <span className="font-semibold">History loaded from WhatsApp.</span>{" "}
                      Scroll up for older messages. Thumbnails for past media may load when you open or forward a message.
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-emerald-800 underline underline-offset-2 hover:bg-emerald-500/15 dark:text-emerald-200"
                      onClick={() => setHistorySyncedHint(false)}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {loadingOlder && (
                  <div className="sticky top-0 z-10 flex justify-center py-2">
                    <div className="inline-flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm animate-in fade-in">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading older messages...
                    </div>
                  </div>
                )}
                {nextCursor && selectedChat && (
                  <div className="flex justify-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={messagesLoading}
                      onClick={() => loadMessages(selectedChat.id, nextCursor)}
                      className="text-muted-foreground"
                    >
                      {messagesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load older messages"}
                    </Button>
                  </div>
                )}
                {(() => {
                  let lastDate = ""
                  return messages.map((msg) => {
                    const d = new Date(msg.timestamp)
                    const dateKey = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()
                    const showDate = dateKey !== lastDate
                    if (showDate) lastDate = dateKey
                    const reactions = Array.isArray(msg.reactions) ? msg.reactions : []
                    const groupedReactions: Record<string, number> = {}
                    reactions.forEach((r: any) => { groupedReactions[r.emoji] = (groupedReactions[r.emoji] || 0) + 1 })
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full">
                              {messageDateLabel(msg.timestamp)}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex group/msg animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                            msg.from_me ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn("flex items-start gap-1 max-w-[80%]", msg.from_me ? "flex-row-reverse" : "flex-row")}>
                            <div
                              className={cn(
                                "relative rounded-2xl px-3.5 py-2.5 shadow-md transition-all duration-200 ease-out will-change-transform motion-safe:hover:scale-[1.008]",
                                msg.from_me
                                  ? "rounded-br-sm border border-emerald-400/40 bg-gradient-to-br from-emerald-500 via-green-500 to-lime-500 text-white"
                                  : "rounded-bl-sm border border-border/70 bg-card/95 text-card-foreground",
                                msg.is_deleted && "opacity-60 italic"
                              )}
                            >
                              {msg.is_starred && (
                                <Star className="absolute -top-1.5 -right-1.5 h-3 w-3 text-yellow-400 fill-yellow-400" />
                              )}
                              {msg.quoted_body && (
                                <div className={cn(
                                  "mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] text-xs",
                                  msg.from_me
                                    ? "bg-white/15 border-l-white/50"
                                    : "bg-background/80 border-l-green-500"
                                )}>
                                  {msg.quoted_from && (
                                    <p className="font-semibold text-[11px] mb-0.5 opacity-80">
                                      {formatContactIdAsNumber(msg.quoted_from)}
                                    </p>
                                  )}
                                  <p className="line-clamp-2 opacity-80">{msg.quoted_body}</p>
                                </div>
                              )}
                              {msg.is_deleted ? (
                                <p className="text-xs italic opacity-60">This message was deleted</p>
                              ) : (
                                <>
                                  {msg.from_number && !msg.from_me && formatContactIdAsNumber(msg.from_number) !== "Status" && (
                                    <p className="text-xs font-semibold text-green-600 mb-0.5">
                                      {selectedChat?.is_group
                                        ? (msg.sender_display_name ?? selectedChat?.display_name ?? selectedChat?.name ?? formatContactIdAsNumber(msg.from_number))
                                        : (selectedChat?.display_name ?? selectedChat?.name ?? msg.sender_display_name ?? formatContactIdAsNumber(msg.from_number))}
                                    </p>
                                  )}
                                  {renderMediaContent(msg, !!msg.from_me)}
                                  {(msg.type !== "text" && msg.type !== "chat" && !msg.body && !msg.media_url) && (
                                    <p className="mt-1 flex items-center gap-1 text-xs italic opacity-80">
                                      {msg.type === "image" && <ImageIcon className="h-3.5 w-3.5" />}
                                      {msg.type === "video" && <Film className="h-3.5 w-3.5" />}
                                      {msg.type === "audio" && <Music2 className="h-3.5 w-3.5" />}
                                      {(msg.type !== "image" && msg.type !== "video" && msg.type !== "audio") && <FileText className="h-3.5 w-3.5" />}
                                      {mediaLabel(msg.type)}
                                    </p>
                                  )}
                                  {msg.body && (
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                                  )}
                                  {(() => {
                                    const url = extractFirstUrl(msg.body)
                                    if (!url) return null
                                    const preview = linkPreviewCache[url]
                                    if (!preview) return null
                                    return (
                                      <a href={preview.url || url} target="_blank" rel="noreferrer"
                                        className={cn("mt-2 block rounded-lg border overflow-hidden no-underline", msg.from_me ? "border-white/30 bg-white/10" : "border-border bg-background")}>
                                        {preview.image && (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={preview.image} alt={preview.title || "Link preview"} className="w-full max-h-40 object-cover" />
                                        )}
                                        <div className="p-2">
                                          {preview.siteName && <p className={cn("text-[10px] uppercase tracking-wide", msg.from_me ? "text-white/70" : "text-muted-foreground")}>{preview.siteName}</p>}
                                          {preview.title && <p className="text-xs font-semibold line-clamp-2">{preview.title}</p>}
                                          {preview.description && <p className={cn("text-[11px] line-clamp-2", msg.from_me ? "text-white/80" : "text-muted-foreground")}>{preview.description}</p>}
                                          <p className={cn("mt-1 inline-flex items-center gap-1 text-[11px]", msg.from_me ? "text-white/75" : "text-muted-foreground")}>
                                            Open link <ExternalLink className="h-3 w-3" />
                                          </p>
                                        </div>
                                      </a>
                                    )
                                  })()}
                                </>
                              )}
                              {Object.keys(groupedReactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(groupedReactions).map(([emoji, count]) => (
                                    <span key={emoji} className={cn(
                                      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border",
                                      msg.from_me ? "border-white/30 bg-white/15" : "border-border bg-background/80"
                                    )}>
                                      {emoji}{count > 1 && <span className="text-[10px]">{count}</span>}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className={cn("flex items-center gap-1 mt-0.5", msg.from_me ? "justify-end" : "justify-start")}>
                                <span className={cn("text-[10px]", msg.from_me ? "text-white/70" : "text-muted-foreground")}>
                                  {messageTime(msg.timestamp)}
                                </span>
                                {msg.from_me && <AckIcon ack={msg.ack} />}
                              </div>
                            </div>
                            {/* Message action buttons */}
                            <div className={cn(
                              "flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity pt-2",
                              msg.from_me ? "flex-row-reverse" : "flex-row"
                            )}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="p-1 rounded-full hover:bg-muted/80 text-muted-foreground">
                                    <SmilePlus className="h-3.5 w-3.5" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top" align="center">
                                  <div className="flex gap-1">
                                    {QUICK_REACTIONS.map((emoji) => (
                                      <button key={emoji} onClick={() => handleReact(msg, emoji)}
                                        className="text-lg hover:scale-125 transition-transform p-1">{emoji}</button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 rounded-full hover:bg-muted/80 text-muted-foreground">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={msg.from_me ? "end" : "start"} className="w-44">
                                  <DropdownMenuItem onClick={() => handleReply(msg)}>
                                    <Reply className="h-4 w-4 mr-2" />Reply
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleForward(msg)}>
                                    <Forward className="h-4 w-4 mr-2" />Forward
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyMessage(msg)}>
                                    <Copy className="h-4 w-4 mr-2" />Copy
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStar(msg)}>
                                    <Star className={cn("h-4 w-4 mr-2", msg.is_starred && "fill-yellow-400 text-yellow-400")} />
                                    {msg.is_starred ? "Unstar" : "Star"}
                                  </DropdownMenuItem>
                                  {msg.from_me && (
                                    <DropdownMenuItem onClick={() => handleMessageInfo(msg)}>
                                      <Info className="h-4 w-4 mr-2" />Message info
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {msg.from_me && (
                                    <DropdownMenuItem onClick={() => handleDelete(msg, true)} className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" />Delete for everyone
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleDelete(msg, false)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete for me
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
                <div ref={messagesEndRef} />
              </div>
            )}
            </div>
          </div>

          {/* Reply pill */}
          {replyingTo && (
            <div className="px-3 pt-2 pb-0 border-t bg-background">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/80 border-l-4 border-l-green-500 max-w-3xl mx-auto">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-600">
                    {replyingTo.from_me ? "You" : (replyingTo.sender_display_name || formatContactIdAsNumber(replyingTo.from_number || ""))}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{replyingTo.body || mediaLabel(replyingTo.type)}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Message input */}
          <div className={cn("p-3 border-t bg-background", replyingTo && "pt-2")}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage() }}
              className="flex items-center gap-2 max-w-3xl mx-auto"
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="wa-image-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 3_000_000) {
                    toast.error("Image too large. Max 3MB.")
                    return
                  }
                  const reader = new FileReader()
                  reader.onload = () => {
                    const dataUrl = typeof reader.result === "string" ? reader.result : null
                    if (dataUrl) setSelectedImage({ dataUrl, fileName: file.name })
                  }
                  reader.readAsDataURL(file)
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => document.getElementById("wa-image-upload")?.click()}>
                <ImagePlus className="h-4 w-4" />
              </Button>
              {selectedImage ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
                  <span className="max-w-[140px] truncate">{selectedImage.fileName}</span>
                  <button type="button" onClick={() => setSelectedImage(null)} className="opacity-70 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
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
                disabled={(!messageInput.trim() && !selectedImage) || sending}
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

      {/* Forward dialog */}
      <Dialog open={forwardModalOpen} onOpenChange={setForwardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forward message</DialogTitle>
            <DialogDescription>Select chats to forward this message to.</DialogDescription>
          </DialogHeader>
          <ForwardChatPicker
            organizationId={orgId}
            chats={chats}
            onConfirm={handleForwardConfirm}
            onCancel={() => { setForwardModalOpen(false); setForwardingMessage(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Message info dialog */}
      <Dialog open={messageInfoOpen} onOpenChange={setMessageInfoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Message info</DialogTitle>
          </DialogHeader>
          {messageInfoLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : messageInfoData ? (
            <div className="space-y-3 text-sm">
              {messageInfoData.read?.length > 0 && (
                <div>
                  <p className="font-semibold text-blue-600 flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" /> Read by</p>
                  {messageInfoData.read.map((r: any, i: number) => (
                    <p key={i} className="text-muted-foreground ml-5">{r.id?._serialized || r.t || "—"}</p>
                  ))}
                </div>
              )}
              {messageInfoData.delivery?.length > 0 && (
                <div>
                  <p className="font-semibold text-muted-foreground flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" /> Delivered to</p>
                  {messageInfoData.delivery.map((r: any, i: number) => (
                    <p key={i} className="text-muted-foreground ml-5">{r.id?._serialized || r.t || "—"}</p>
                  ))}
                </div>
              )}
              {messageInfoData.played?.length > 0 && (
                <div>
                  <p className="font-semibold text-green-600 flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Played by</p>
                  {messageInfoData.played.map((r: any, i: number) => (
                    <p key={i} className="text-muted-foreground ml-5">{r.id?._serialized || r.t || "—"}</p>
                  ))}
                </div>
              )}
              {(!messageInfoData.read?.length && !messageInfoData.delivery?.length && !messageInfoData.played?.length) && (
                <p className="text-muted-foreground text-center py-4">No delivery info available yet.</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No info available.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ForwardChatPicker({ organizationId, chats, onConfirm, onCancel }: {
  organizationId: string | undefined
  chats: WhatsAppChat[]
  onConfirm: (ids: string[]) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const filtered = chats.filter((c) => {
    if (!search) return true
    const name = (c.display_name || c.name || c.contact_id).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-3">
      <Input placeholder="Search chats..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
      <ScrollArea className="h-60">
        <div className="space-y-1">
          {filtered.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                setSelected((prev) => {
                  const next = new Set(prev)
                  if (next.has(chat.id)) next.delete(chat.id)
                  else next.add(chat.id)
                  return next
                })
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-muted/50 transition-colors",
                selected.has(chat.id) && "bg-green-50 dark:bg-green-950/30"
              )}
            >
              <ContactAvatar
                displayName={chat.display_name || formatChatDisplayName(chat)}
                isGroup={chat.is_group}
                photoUrl={chat.profile_picture_url}
                avatarSrc={whatsappAvatarSrc(organizationId, chat.contact_id)}
              />
              <span className="flex-1 truncate">{chat.display_name || formatChatDisplayName(chat)}</span>
              {selected.has(chat.id) && <Check className="h-4 w-4 text-green-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={selected.size === 0} onClick={() => onConfirm(Array.from(selected))}
          className="bg-green-500 hover:bg-green-600 text-white">
          Forward{selected.size > 0 && ` (${selected.size})`}
        </Button>
      </div>
    </div>
  )
}
