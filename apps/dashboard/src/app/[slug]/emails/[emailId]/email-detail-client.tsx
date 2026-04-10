"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Trash2,
  Download,
  Paperclip,
  Star,
  MoreVertical,
  Reply,
  Forward,
  ReplyAll,
  Printer as Print,
  ChevronDown,
  ChevronUp,
  Mail,
  User,
  Calendar,
  Eye,
  FileText,
  Image as ImageIcon,
  FileType,
  Loader2,
  MessagesSquare,
} from "lucide-react"
import { toast } from "sonner"
import DOMPurify from "dompurify"
import { cn } from "@/lib/utils"
import { OUTBOUND_MAX_ATTACHMENT_BYTES } from "@/lib/email-compose-constants"

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = String(r.result || "")
      const i = s.indexOf(",")
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    r.onerror = () => reject(new Error("Could not read file"))
    r.readAsDataURL(file)
  })
}
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmailAvatar } from "@/components/emails/email-avatar"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export interface Email {
  id: string
  from: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  date: Date | string
  textBody: string | null
  htmlBody: string | null
  read: boolean
  createdAt: Date | string
  direction?: string
  outbound_provider?: string | null
  fallback_used?: boolean
  provider_message_id?: string | null
  attachments: any[]
  inlineImages: any[]
  starred?: boolean
  is_draft?: boolean
  scheduled_send_at?: string | null
  sent_at?: string | null
  sender_avatar_url?: string | null
  messageId?: string
  in_reply_to?: string
  references?: string
}

interface EmailDetailClientProps {
  email: Email
  organizationSlug: string
  /** Mail domain for From hint (optional). */
  mailDomain?: string
}

type PreviewType = "image" | "pdf" | "text"

function getPreviewType(attachment: { filename?: string; contentType?: string }): PreviewType | null {
  const name = (attachment.filename || "").toLowerCase()
  const type = (attachment.contentType || "").toLowerCase()
  const ext = name.includes(".") ? name.split(".").pop()! : ""

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "ico"]
  const textExts = ["txt", "csv", "json", "xml", "md", "log", "yml", "yaml", "html", "css", "js", "ts", "tsx", "jsx"]
  const textTypes = ["text/plain", "text/csv", "text/html", "text/css", "application/json", "application/xml", "text/xml", "text/markdown"]

  if (type.startsWith("image/") || imageExts.includes(ext)) return "image"
  if (type === "application/pdf" || ext === "pdf") return "pdf"
  if (type === "application/zip" || type === "application/x-zip-compressed" || ext === "zip" || ext === "gz" || type.includes("gzip"))
    return null
  if (type.startsWith("text/") || textTypes.some((t) => type.includes(t)) || textExts.includes(ext)) return "text"

  return null
}

function isArchiveAttachment(attachment: { filename?: string; contentType?: string }): boolean {
  const name = (attachment.filename || "").toLowerCase()
  const type = (attachment.contentType || "").toLowerCase()
  const ext = name.includes(".") ? name.split(".").pop()! : ""
  return type === "application/zip" || type === "application/x-zip-compressed" || type.includes("zip") || ext === "zip" || ext === "gz" || type.includes("gzip")
}

/** Remove inline color/background so dark theme text isn’t stuck as black. */
function stripHardcodedEmailColors(html: string): string {
  return html.replace(/\sstyle="([^"]*)"/gi, (_, styles: string) => {
    const cleaned = styles
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !/^(color|background|background-color)\s*:/i.test(s))
      .join("; ")
    return cleaned ? ` style="${cleaned}"` : ""
  })
}

/** Collapse Gmail-style quoted thread into a <details> so the new reply stays readable. */
function wrapGmailQuoteInDetails(html: string): string {
  if (typeof window === "undefined") return html
  try {
    const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html")
    const root = doc.getElementById("__root")
    if (!root) return html
    const quote = root.querySelector("div.gmail_quote")
    if (!quote || quote.closest("details.email-quote-collapse")) return html
    const details = doc.createElement("details")
    details.className = "email-quote-collapse"
    const summary = doc.createElement("summary")
    summary.textContent = "Quoted conversation"
    const inner = doc.createElement("div")
    quote.parentNode?.insertBefore(details, quote)
    details.appendChild(summary)
    inner.appendChild(quote)
    details.appendChild(inner)
    return root.innerHTML
  } catch {
    return html
  }
}

function linkifyPlainTextToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
  const linked = esc.replace(
    /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  return linked.replace(/\r\n/g, "\n").split("\n").join("<br />\n")
}

function normalizeEmailDto(raw: Record<string, unknown>): Email {
  const e = raw as any
  return {
    ...e,
    date: e.date ? new Date(e.date as string) : new Date(),
    createdAt: e.createdAt ? new Date(e.createdAt as string) : new Date(),
    to: Array.isArray(e.to) ? e.to : [],
    cc: Array.isArray(e.cc) ? e.cc : [],
    bcc: Array.isArray(e.bcc) ? e.bcc : [],
    attachments: Array.isArray(e.attachments) ? e.attachments : [],
  }
}

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  }
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function displaySender(from: string) {
  return from?.trim() || "Unknown"
}

function formatAttachmentSize(attachment: any) {
  const size = attachment.size ?? attachment.file_size
  if (!size) return "Unknown size"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function EmailHTMLBody({ html }: { html: string }) {
  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a")
    if (anchor?.href) {
      e.preventDefault()
      e.stopPropagation()
      window.open(anchor.href, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className="w-full overflow-x-auto overflow-y-visible min-h-0" onClickCapture={handleLinkClick}>
      <div
        className={cn(
          "email-html-body w-full max-w-none min-w-0 px-4 py-4 sm:px-6 sm:py-5",
          "text-foreground [&_*]:max-w-full",
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed prose-p:my-3",
          "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
          "prose-strong:text-foreground prose-li:text-foreground prose-td:text-foreground prose-th:text-foreground",
          "prose-code:text-foreground prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:text-foreground",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_table]:text-sm",
          "[&_.gmail_quote]:text-muted-foreground [&_.gmail_quote]:text-[13px] [&_.gmail_quote]:leading-relaxed",
          "[&_.gmail_quote]:mt-3 [&_.gmail_quote]:max-h-[min(50vh,320px)] [&_.gmail_quote]:overflow-y-auto [&_.gmail_quote]:rounded-md [&_.gmail_quote]:border [&_.gmail_quote]:border-border/50 [&_.gmail_quote]:bg-muted/20 [&_.gmail_quote]:px-3 [&_.gmail_quote]:py-2",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:text-[13px]",
          "[&_.email-quote-collapse]:not-prose",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function EmailTextBody({ text }: { text: string }) {
  const safe = useMemo(() => {
    if (typeof window === "undefined") return ""
    return DOMPurify.sanitize(linkifyPlainTextToHtml(text), { ADD_ATTR: ["target", "rel"] })
  }, [text])

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5">
      <div
        className={cn(
          "rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm sm:text-[15px] leading-relaxed text-foreground",
          "prose prose-sm dark:prose-invert max-w-none",
          "prose-a:text-primary prose-a:font-medium",
        )}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </div>
  )
}

function MessageSanitizedHtml({ htmlBody }: { htmlBody: string }) {
  const [html, setHtml] = useState("")

  useEffect(() => {
    if (!htmlBody || typeof window === "undefined") {
      setHtml("")
      return
    }
    const stripped = stripHardcodedEmailColors(htmlBody)
    const safe = DOMPurify.sanitize(stripped, {
      ADD_ATTR: ["target", "rel", "class"],
      ADD_TAGS: ["details", "summary"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    })
    const collapsed = wrapGmailQuoteInDetails(safe)
    setHtml(
      DOMPurify.sanitize(collapsed, {
        ADD_ATTR: ["target", "rel", "class"],
        ADD_TAGS: ["details", "summary"],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
      })
    )
  }, [htmlBody])

  if (!html) return null
  return <EmailHTMLBody html={html} />
}

export function EmailDetailClient({ email: seedEmail, organizationSlug, mailDomain }: EmailDetailClientProps) {
  const router = useRouter()
  const [thread, setThread] = useState<Email[]>([])
  const [threadLoading, setThreadLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPlainTextFor, setShowPlainTextFor] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    url: string
    filename: string
    type: PreviewType
    index: number
    emailId: string
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyFromLocal, setReplyFromLocal] = useState("noreply")
  const [replyReplyTo, setReplyReplyTo] = useState("")
  const [replyAttachments, setReplyAttachments] = useState<{ id: string; file: File }[]>([])
  const replyFileRef = useRef<HTMLInputElement>(null)
  const [sendingReply, setSendingReply] = useState(false)
  const [starred, setStarred] = useState(!!seedEmail.starred)
  const [starSaving, setStarSaving] = useState(false)

  const refreshThread = useCallback(async () => {
    try {
      const r = (await api.emails.getThread(seedEmail.id)) as {
        success?: boolean
        data?: { emails?: Record<string, unknown>[] }
      }
      if (r?.success && Array.isArray(r.data?.emails) && r.data!.emails!.length > 0) {
        setThread(r.data!.emails!.map((e) => normalizeEmailDto(e)))
        return
      }
    } catch {
      /* fall through */
    }
    setThread([normalizeEmailDto(seedEmail as unknown as Record<string, unknown>)])
  }, [seedEmail])

  useEffect(() => {
    let cancelled = false
    setThreadLoading(true)
    void (async () => {
      try {
        await refreshThread()
      } finally {
        if (!cancelled) setThreadLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshThread, seedEmail.id])

  useEffect(() => {
    setStarred(!!seedEmail.starred)
  }, [seedEmail.id, seedEmail.starred])

  const headerSubject = thread[0]?.subject || seedEmail.subject || "(No subject)"
  const replyAnchor = useMemo(() => (thread.length > 0 ? thread[thread.length - 1] : seedEmail), [thread, seedEmail])

  const toggleStar = useCallback(async () => {
    const next = !starred
    setStarred(next)
    setStarSaving(true)
    try {
      await api.emails.patchMeta(seedEmail.id, { starred: next })
    } catch {
      setStarred(!next)
      toast.error("Could not update star")
    } finally {
      setStarSaving(false)
    }
  }, [seedEmail.id, starred])

  const getAttachmentEndpoint = (emailId: string, attachmentIndex: number, download = false) =>
    `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")}/api/emails/${encodeURIComponent(emailId)}/attachment/${attachmentIndex}${download ? "?download=1" : ""}`

  const fetchAttachmentBlobUrl = async (emailId: string, attachmentIndex: number, download = false) => {
    const endpoint = getAttachmentEndpoint(emailId, attachmentIndex, download)
    const response = await fetch(endpoint, { credentials: "include" })
    if (!response.ok) throw new Error("Failed to fetch attachment")
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  const handleDelete = async () => {
    if (!confirm("Delete this message?")) return
    try {
      await api.emails.delete(seedEmail.id)
      toast.success("Email deleted")
      router.push(`/${organizationSlug}/emails`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete email")
    }
  }

  const handleDownloadAttachment = async (emailId: string, attachmentIndex: number, filename: string) => {
    let blobUrl: string | null = null
    try {
      blobUrl = await fetchAttachmentBlobUrl(emailId, attachmentIndex, true)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl!), 2000)
    } catch (err) {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      toast.error(err instanceof Error ? err.message : "Failed to download attachment")
    }
  }

  const handlePreviewAttachment = async (emailId: string, attachmentIndex: number, attachment: any) => {
    const type = getPreviewType(attachment)
    if (!type) return

    setLoadingPreview(true)
    setTextPreviewContent(null)
    let blobUrl: string | null = null
    try {
      blobUrl = await fetchAttachmentBlobUrl(emailId, attachmentIndex, false)
      setLoadingPreview(false)

      setPreview({
        url: blobUrl,
        filename: attachment.filename || "attachment",
        type,
        index: attachmentIndex,
        emailId,
      })

      if (type === "text") {
        fetch(blobUrl)
          .then((r) => (r.ok ? r.text() : Promise.reject(new Error("Failed to load"))))
          .then(setTextPreviewContent)
          .catch(() => setTextPreviewContent("(Unable to load text preview. You can download the file.)"))
      }
    } catch (err) {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setLoadingPreview(false)
      toast.error(err instanceof Error ? err.message : "Failed to load preview")
    }
  }

  const handlePreviewOpenChange = (open: boolean) => {
    if (!open) {
      if (preview?.url?.startsWith("blob:")) URL.revokeObjectURL(preview.url)
      setPreview(null)
      setTextPreviewContent(null)
    }
  }

  const handleReply = async () => {
    const text = replyText.trim()
    if (!text || !replyAnchor) return
    setSendingReply(true)
    try {
      const att: { filename: string; contentType: string; contentBase64: string }[] = []
      for (const a of replyAttachments.slice(0, 10)) {
        if (a.file.size > OUTBOUND_MAX_ATTACHMENT_BYTES) {
          throw new Error(`"${a.file.name}" exceeds 8 MB`)
        }
        att.push({
          filename: a.file.name,
          contentType: a.file.type || "application/octet-stream",
          contentBase64: await readFileAsBase64(a.file),
        })
      }
      const result = (await api.emails.reply(replyAnchor.id, {
        text,
        fromLocalPart: replyFromLocal.trim() || undefined,
        replyTo: replyReplyTo.trim() || undefined,
        attachments: att.length ? att : undefined,
      })) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Failed to send reply")
      toast.success("Reply sent")
      setReplyText("")
      setReplyReplyTo("")
      setReplyAttachments([])
      await refreshThread()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply")
    } finally {
      setSendingReply(false)
    }
  }

  const toggleHeaders = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Dialog open={!!preview} onOpenChange={handlePreviewOpenChange}>
        <DialogContent
          className={cn(
            "max-w-[calc(100vw-2rem)] overflow-hidden flex flex-col p-0 gap-0",
            preview?.type === "image" && "max-w-5xl max-h-[90vh] w-full",
            preview?.type === "pdf" && "max-w-5xl max-h-[90vh] w-full",
            preview?.type === "text" && "max-w-3xl max-h-[85vh] w-full",
          )}
          showCloseButton={true}
        >
          {preview && (
            <>
              <DialogHeader className="px-6 py-4 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2 truncate pr-8">
                  {preview.type === "image" && <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  {preview.type === "pdf" && <FileType className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  {preview.type === "text" && <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <span className="truncate">{preview.filename}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-center bg-muted/20 p-4">
                {preview.type === "image" && (
                  <img src={preview.url} alt={preview.filename} className="max-w-full max-h-[75vh] w-auto object-contain rounded-lg shadow-lg" />
                )}
                {preview.type === "pdf" && (
                  <iframe
                    src={preview.url}
                    title={preview.filename}
                    className="h-[min(75dvh,640px)] min-h-[280px] w-full rounded-lg border bg-background sm:min-h-[400px]"
                  />
                )}
                {preview.type === "text" && (
                  <div className="w-full h-[60vh] min-h-[200px] overflow-auto rounded-lg border bg-background p-4">
                    {textPreviewContent === null ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{textPreviewContent}</pre>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-3 border-t flex justify-end gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => preview && handleDownloadAttachment(preview.emailId, preview.index, preview.filename)}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <a href={preview.url} target="_blank" rel="noopener noreferrer">
                    Open in new tab
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPlainTextFor} onOpenChange={(o) => !o && setShowPlainTextFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Plain text
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-muted/10 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {thread.find((m) => m.id === showPlainTextFor)?.textBody || ""}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-20 border-b border-border/80 bg-background shadow-sm">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 sm:h-9 sm:w-9" asChild>
            <Link href={`/${organizationSlug}/emails`} aria-label="Back to Inbox">
              <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground" title={headerSubject}>
                <span className="line-clamp-2 sm:truncate sm:line-clamp-none">{headerSubject}</span>
              </h1>
              {thread.length > 1 && (
                <Badge variant="secondary" className="shrink-0 gap-1 text-[10px] font-medium sm:text-[11px]">
                  <MessagesSquare className="h-3 w-3" />
                  {thread.length} in thread
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-[11px] sm:text-xs">
              {displaySender(seedEmail.from)} · {formatDate(seedEmail.date)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9", starred && "text-amber-500")}
              onClick={() => void toggleStar()}
              disabled={starSaving}
              aria-pressed={starred}
            >
              <Star className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-500")} />
              <span className="sr-only">Star</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleDelete} title="Delete">
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              <span className="sr-only">Delete</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                <DropdownMenuItem disabled>
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <ReplyAll className="h-4 w-4 mr-2" />
                  Reply all
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Print className="h-4 w-4 mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto w-full max-w-[1400px] px-3 pb-40 pt-3 sm:px-5 sm:pb-36 sm:pt-6 lg:px-8">
          {threadLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin opacity-60" />
              <p className="text-sm">Loading conversation…</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {thread.map((msg) => {
                const showFullHeaders = expandedId === msg.id
                const hasAttachments = msg.attachments?.length > 0
                const isOutbound = msg.direction === "outbound"
                const isSeed = msg.id === seedEmail.id

                return (
                  <Card
                    key={msg.id}
                    className={cn(
                      "overflow-hidden border-border/70 shadow-sm transition-shadow",
                      isSeed && "shadow-md ring-2 ring-primary/20",
                      isOutbound && "bg-muted/25"
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4 lg:p-5">
                        <EmailAvatar
                          email={msg.from}
                          senderAvatarUrl={msg.sender_avatar_url}
                          size={48}
                          className="h-10 w-10 shrink-0 ring-1 ring-border/50 sm:h-12 sm:w-12"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-semibold leading-tight text-foreground" title={msg.from}>
                                {displaySender(msg.from)}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleHeaders(msg.id)}
                                className="mt-0.5 flex max-w-full items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate font-mono text-[11px] sm:text-xs">{msg.from}</span>
                                {showFullHeaders ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                              </button>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:self-start">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span className="tabular-nums">{formatDate(msg.date)}</span>
                              {isOutbound && msg.outbound_provider === "resend" && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                  Sent
                                </Badge>
                              )}
                            </div>
                          </div>

                          {showFullHeaders && (
                            <div className="space-y-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                              <div className="grid grid-cols-1 gap-x-2 gap-y-1 sm:grid-cols-[4rem_1fr] sm:gap-y-0.5">
                                <span className="text-muted-foreground sm:pt-0.5">To</span>
                                <span className="break-all text-foreground">{msg.to.join(", ") || "—"}</span>
                                {msg.cc?.length > 0 && (
                                  <>
                                    <span className="text-muted-foreground sm:pt-0.5">Cc</span>
                                    <span className="break-all text-foreground">{msg.cc.join(", ")}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {!showFullHeaders && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3 shrink-0" />
                              <span>
                                to{" "}
                                {msg.to.length === 1 ? <span className="text-foreground">{msg.to[0]}</span> : `${msg.to.length} recipients`}
                              </span>
                            </p>
                          )}

                          {hasAttachments && (
                            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                              {msg.attachments.map((attachment: any, index: number) => {
                                const previewType = getPreviewType(attachment)
                                return (
                                  <div
                                    key={index}
                                    className="flex w-full min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2 text-xs sm:w-auto sm:max-w-full sm:bg-background/80"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 max-w-full flex-1 truncate sm:max-w-[200px] md:max-w-[280px]" title={attachment.filename}>
                                      {attachment.filename}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">{formatAttachmentSize(attachment)}</span>
                                    <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
                                      {previewType && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 px-2 sm:h-7"
                                          title="Preview"
                                          onClick={() => void handlePreviewAttachment(msg.id, index, attachment)}
                                          disabled={loadingPreview}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          <span className="sr-only">Preview</span>
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8 px-2 sm:h-7"
                                        title="Download"
                                        onClick={() => void handleDownloadAttachment(msg.id, index, attachment.filename || "attachment")}
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                        <span className="sr-only">Download</span>
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          <Separator className="my-1" />

                          <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
                            {msg.htmlBody ? (
                              <MessageSanitizedHtml htmlBody={msg.htmlBody} />
                            ) : msg.textBody ? (
                              <EmailTextBody text={msg.textBody} />
                            ) : (
                              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No body content</div>
                            )}
                          </div>

                          {msg.textBody && msg.htmlBody && (
                            <button
                              type="button"
                              className="mt-1 text-left text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                              onClick={() => setShowPlainTextFor((prev) => (prev === msg.id ? null : msg.id))}
                            >
                              {showPlainTextFor === msg.id ? "Hide plain text" : "Plain text version"}
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 z-20 border-t border-border/80 bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="mx-auto w-full max-w-[1400px] px-3 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <Reply className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">Reply</span>
              </div>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,7rem)_1fr] sm:gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reply-from-local" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="reply-from-local"
                    value={replyFromLocal}
                    onChange={(e) => setReplyFromLocal(e.target.value)}
                    placeholder="noreply"
                    className="h-9 text-sm"
                    spellCheck={false}
                  />
                  {mailDomain ? (
                    <p className="text-[10px] text-muted-foreground font-mono truncate">@{mailDomain}</p>
                  ) : null}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="reply-body" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Message
                    </Label>
                    <input
                      ref={replyFileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files
                        if (!files?.length) return
                        const next: { id: string; file: File }[] = []
                        for (let i = 0; i < files.length && replyAttachments.length + next.length < 10; i++) {
                          const f = files[i]
                          if (f.size > OUTBOUND_MAX_ATTACHMENT_BYTES) {
                            toast.error(`"${f.name}" exceeds 8 MB`)
                            continue
                          }
                          next.push({ id: `${Date.now()}-${i}`, file: f })
                        }
                        setReplyAttachments((prev) => [...prev, ...next].slice(0, 10))
                        e.target.value = ""
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => replyFileRef.current?.click()}
                      disabled={replyAttachments.length >= 10}
                    >
                      <Paperclip className="h-3.5 w-3.5 mr-1" />
                      Attach
                    </Button>
                  </div>
                  <Textarea
                    id="reply-body"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${displaySender(replyAnchor?.from || "")}…`}
                    className="min-h-[72px] max-h-[200px] resize-y text-sm sm:min-h-[80px]"
                    rows={3}
                  />
                  {replyAttachments.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5 text-[11px]">
                      {replyAttachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5"
                        >
                          <span className="max-w-[140px] truncate">{a.file.name}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Remove"
                            onClick={() => setReplyAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1 sm:pl-[calc(7rem+0.5rem)] sm:max-w-xl">
                <Label htmlFor="reply-reply-to" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Reply-To
                </Label>
                <Input
                  id="reply-reply-to"
                  type="email"
                  value={replyReplyTo}
                  onChange={(e) => setReplyReplyTo(e.target.value)}
                  placeholder="Leave blank to use the same address as From"
                  className="h-9 text-sm font-mono"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>
            <Button
              className="h-10 w-full shrink-0 sm:w-auto sm:min-w-[7rem]"
              onClick={() => void handleReply()}
              disabled={sendingReply || !replyText.trim()}
            >
              {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
            Replies to the latest message in this thread, include prior context for the recipient, and use your name on the From line when your account has a display name set.
          </p>
        </div>
      </div>
    </div>
  )
}
