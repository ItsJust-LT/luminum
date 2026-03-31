"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Trash2,
  Download,
  Paperclip,
  Archive,
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
} from "lucide-react"
import { toast } from "sonner"
import DOMPurify from "dompurify"
import { cn } from "@/lib/utils"
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

interface Email {
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
}

interface EmailDetailClientProps {
  email: Email
  organizationSlug: string
}

type PreviewType = "image" | "pdf" | "text"

function getPreviewType(attachment: { filename?: string; contentType?: string }): PreviewType | null {
  const name = (attachment.filename || "").toLowerCase()
  const type = (attachment.contentType || "").toLowerCase()
  const ext = name.includes(".") ? name.split(".").pop()! : ""

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "ico"]
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/avif", "image/x-icon"]

  const textExts = ["txt", "csv", "json", "xml", "md", "log", "yml", "yaml", "html", "css", "js", "ts", "tsx", "jsx"]
  const textTypes = ["text/plain", "text/csv", "text/html", "text/css", "application/json", "application/xml", "text/xml", "text/markdown"]

  if (type.startsWith("image/") || imageExts.includes(ext)) return "image"
  if (type === "application/pdf" || ext === "pdf") return "pdf"
  if (
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    ext === "zip" ||
    ext === "gz" ||
    type.includes("gzip")
  )
    return null
  if (type.startsWith("text/") || textTypes.some((t) => type.includes(t)) || textExts.includes(ext)) return "text"

  return null
}

function isArchiveAttachment(attachment: { filename?: string; contentType?: string }): boolean {
  const name = (attachment.filename || "").toLowerCase()
  const type = (attachment.contentType || "").toLowerCase()
  const ext = name.includes(".") ? name.split(".").pop()! : ""
  return (
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type.includes("zip") ||
    ext === "zip" ||
    ext === "gz" ||
    type.includes("gzip")
  )
}

export function EmailDetailClient({ email, organizationSlug }: EmailDetailClientProps) {
  const router = useRouter()
  const [showFullHeaders, setShowFullHeaders] = useState(false)
  const [showPlainTextDialog, setShowPlainTextDialog] = useState(false)
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("")
  const [preview, setPreview] = useState<{
    url: string
    filename: string
    type: PreviewType
    index: number
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [starred, setStarred] = useState(!!email.starred)
  const [starSaving, setStarSaving] = useState(false)

  useEffect(() => {
    setStarred(!!email.starred)
  }, [email.id, email.starred])

  const toggleStar = useCallback(async () => {
    const next = !starred
    setStarred(next)
    setStarSaving(true)
    try {
      await api.emails.patchMeta(email.id, { starred: next })
    } catch {
      setStarred(!next)
      toast.error("Could not update star")
    } finally {
      setStarSaving(false)
    }
  }, [email.id, starred])

  const getAttachmentEndpoint = (attachmentIndex: number, download = false) =>
    `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")}/api/emails/${encodeURIComponent(email.id)}/attachment/${attachmentIndex}${download ? "?download=1" : ""}`

  const fetchAttachmentBlobUrl = async (attachmentIndex: number, download = false) => {
    const endpoint = getAttachmentEndpoint(attachmentIndex, download)
    const response = await fetch(endpoint, { credentials: "include" })
    if (!response.ok) throw new Error("Failed to fetch attachment")
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  useEffect(() => {
    if (email.htmlBody && typeof window !== "undefined") {
      setSanitizedHtml(DOMPurify.sanitize(email.htmlBody))
    }
  }, [email.htmlBody])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this email?")) return

    try {
      await api.emails.delete(email.id)
      toast.success("Email deleted")
      router.push(`/${organizationSlug}/emails`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete email")
    }
  }

  const handleDownloadAttachment = async (attachmentIndex: number) => {
    let blobUrl: string | null = null
    try {
      blobUrl = await fetchAttachmentBlobUrl(attachmentIndex, true)
      const filename = email.attachments[attachmentIndex]?.filename || "attachment"
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

  const handlePreviewAttachment = async (attachmentIndex: number) => {
    const attachment = email.attachments[attachmentIndex]
    const type = getPreviewType(attachment)
    if (!type) return

    setLoadingPreview(true)
    setTextPreviewContent(null)
    let blobUrl: string | null = null
    try {
      blobUrl = await fetchAttachmentBlobUrl(attachmentIndex, false)
      setLoadingPreview(false)

      setPreview({
        url: blobUrl,
        filename: attachment.filename || "attachment",
        type,
        index: attachmentIndex,
      })

      if (type === "text") {
        setTextPreviewContent(null)
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
    if (!text) return
    setSendingReply(true)
    try {
      const result = await api.post(`/api/emails/${email.id}/reply`, { text }) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Failed to send reply")
      toast.success("Reply sent")
      setReplyText("")
      router.push(`/${organizationSlug}/emails`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply")
    } finally {
      setSendingReply(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } else if (diffDays < 7) {
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } else {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    }
  }

  const displaySender = (from: string) => {
    return from || "Unknown"
  }

  const formatAttachmentSize = (attachment: any) => {
    const size = attachment.size ?? attachment.file_size
    if (!size) return "Unknown size"
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const hasAttachments = email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Attachment preview dialog */}
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
                  <img
                    src={preview.url}
                    alt={preview.filename}
                    className="max-w-full max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
                  />
                )}
                {preview.type === "pdf" && (
                  <iframe
                    src={preview.url}
                    title={preview.filename}
                    className="w-full h-[75vh] min-h-[400px] rounded-lg border bg-background"
                  />
                )}
                {preview.type === "text" && (
                  <div className="w-full h-[60vh] min-h-[200px] overflow-auto rounded-lg border bg-background p-4">
                    {textPreviewContent === null ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                        {textPreviewContent}
                      </pre>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-3 border-t flex justify-end gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => preview && handleDownloadAttachment(preview.index)}>
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

      {/* Sticky toolbar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" asChild>
            <Link href={`/${organizationSlug}/emails`} aria-label="Back to Inbox">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-foreground truncate" title={email.subject || "(No subject)"}>
              {email.subject || "(No subject)"}
            </h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              {displaySender(email.from)} · {formatDate(email.date)}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9" disabled title="Archive">
              <Archive className="h-4 w-4" />
              <span className="sr-only">Archive</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleDelete} title="Delete">
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              <span className="sr-only">Delete</span>
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" className="h-9 w-9" disabled title="Reply">
              <Reply className="h-4 w-4" />
              <span className="sr-only">Reply</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem disabled>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <ReplyAll className="h-4 w-4 mr-2" />
                  Reply all
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </DropdownMenuItem>
                {email.textBody && (
                  <DropdownMenuItem onClick={() => setShowPlainTextDialog(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    View plain text
                  </DropdownMenuItem>
                )}
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

      <ScrollArea className="flex-1">
        <div className="w-full max-w-3xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:py-8 md:px-6 space-y-4 sm:space-y-6">
          {/* Subject + meta (single block) */}
          <div className="space-y-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight leading-tight break-words">
              {email.subject || "(No subject)"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(email.date)}
              </span>
              {email.is_draft ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-800 dark:text-amber-200">
                  Draft
                </Badge>
              ) : null}
              {email.scheduled_send_at && !email.sent_at && !email.is_draft ? (
                <Badge variant="secondary" className="gap-1">
                  <span className="opacity-70">Scheduled</span>
                  <span className="tabular-nums">{formatDate(email.scheduled_send_at)}</span>
                </Badge>
              ) : null}
            </div>
            {email.direction === "outbound" && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {email.outbound_provider === "resend" && (
                  <Badge variant="secondary">Sent via Resend</Badge>
                )}
                {email.outbound_provider === "ses" && (
                  <Badge variant="outline">Sent via SES (legacy)</Badge>
                )}
                {email.outbound_provider === "mail_app" && !email.fallback_used && (
                  <Badge variant="outline">Sent via mail server (legacy)</Badge>
                )}
                {email.provider_message_id && (
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-full" title={email.provider_message_id}>
                    Message id: {email.provider_message_id}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sender + recipients card */}
          <Card className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 md:p-5">
                <EmailAvatar
                  email={email.from}
                  senderAvatarUrl={email.sender_avatar_url}
                  size={56}
                  className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-primary/5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate" title={email.from}>
                        {displaySender(email.from)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowFullHeaders(!showFullHeaders)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mt-0.5 min-w-0"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{email.from}</span>
                        {showFullHeaders ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8 rounded-lg", starred && "text-amber-500")}
                        onClick={() => void toggleStar()}
                        disabled={starSaving}
                        aria-pressed={starred}
                      >
                        <Star className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-500")} />
                        <span className="sr-only">{starred ? "Unstar" : "Star"}</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Reply className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl min-w-[240px]">
                          <div className="px-2 py-2 text-xs text-muted-foreground border-b">
                            <p className="font-medium text-foreground mb-0.5">From</p>
                            <p className="font-mono text-foreground break-all">{email.from}</p>
                          </div>
                          <DropdownMenuItem disabled>Reply</DropdownMenuItem>
                          <DropdownMenuItem disabled>Forward</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (email.from) {
                                navigator.clipboard.writeText(email.from)
                                toast.success("Address copied")
                              }
                            }}
                          >
                            Copy sender address
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {!showFullHeaders && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        to {email.to.length === 1 ? <span className="text-foreground">{email.to[0]}</span> : `${email.to.length} recipients`}
                      </span>
                    </div>
                  )}
                  {showFullHeaders && (
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                        <span className="text-muted-foreground shrink-0">From:</span>
                        <span className="text-foreground break-all">{email.from}</span>
                        <span className="text-muted-foreground shrink-0">To:</span>
                        <span className="text-foreground break-all">{email.to.join(", ")}</span>
                        {email.cc?.length > 0 && (
                          <>
                            <span className="text-muted-foreground shrink-0">Cc:</span>
                            <span className="text-foreground break-all">{email.cc.join(", ")}</span>
                          </>
                        )}
                        <span className="text-muted-foreground shrink-0">Date:</span>
                        <span className="text-foreground">{formatDate(email.date)}</span>
                        <span className="text-muted-foreground shrink-0">Subject:</span>
                        <span className="text-foreground">{email.subject || "(No subject)"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {hasAttachments && (
            <Card className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {email.attachments.length} attachment{email.attachments.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((attachment: any, index: number) => {
                    const previewType = getPreviewType(attachment)
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-background/50 px-3 py-3 sm:px-4 w-full sm:min-w-[260px] sm:max-w-full",
                          "hover:bg-muted/30 transition-colors group",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            {isArchiveAttachment(attachment) ? (
                              <Archive className="h-4 w-4 sm:h-5 sm:w-5 text-primary" aria-hidden />
                            ) : (
                              <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={attachment.filename}>
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isArchiveAttachment(attachment)
                                ? `${formatAttachmentSize(attachment)} · Archive (download to open)`
                                : formatAttachmentSize(attachment)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-[52px] sm:pl-0">
                          {previewType && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePreviewAttachment(index)}
                              disabled={loadingPreview}
                              className="gap-1.5 h-8"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">Preview</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownloadAttachment(index)}
                            className="gap-1.5 h-8"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Body: always HTML when available */}
          <Card className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {email.htmlBody ? (
              <EmailHTMLRenderer html={sanitizedHtml} />
            ) : email.textBody ? (
              <EmailTextRenderer text={email.textBody} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="rounded-full bg-muted/50 p-4 mb-4">
                  <Mail className="h-10 w-10 text-muted-foreground/70" />
                </div>
                <p className="text-sm font-medium text-foreground">No content</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  This message has no body content.
                </p>
              </div>
            )}
          </Card>

          {/* Plain text dialog (opened from dropdown) */}
          <Card className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Quick reply</span>
            </div>
            <div className="p-4 space-y-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[120px]"
              />
              <div className="flex justify-end">
                <Button onClick={handleReply} disabled={sendingReply || !replyText.trim()}>
                  {sendingReply ? "Sending..." : "Send reply"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Plain text dialog (opened from dropdown) */}
          <Dialog open={showPlainTextDialog} onOpenChange={setShowPlainTextDialog}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Plain text
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-muted/10 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {email.textBody || ""}
                </pre>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    </div>
  )
}

function EmailHTMLRenderer({ html }: { html: string }) {
  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a")
    if (anchor?.href) {
      e.preventDefault()
      e.stopPropagation()
      window.open(anchor.href, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div
      className="w-full overflow-x-hidden overflow-y-visible min-h-[200px]"
      style={{ minHeight: 200 }}
      onClickCapture={handleLinkClick}
    >
      {/* Fit to container: no horizontal scroll; images/tables scale down */}
      <div
        className={cn(
          "email-html-body w-full max-w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8",
          "prose prose-sm md:prose-base max-w-none",
          "dark:invert dark:[color-scheme:light]",
          "[&_img]:dark:invert [&_img]:max-w-full [&_img]:h-auto",
          "[&_table]:max-w-full",
          "[&_iframe]:max-w-full",
          "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
          "prose-p:leading-[1.7] prose-p:text-foreground prose-p:my-3",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
          "prose-strong:font-semibold prose-strong:text-foreground",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted prose-pre:border prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-4 prose-pre:max-w-full prose-pre:overflow-x-auto",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:my-4 prose-blockquote:not-italic prose-blockquote:bg-muted/20 prose-blockquote:text-muted-foreground prose-blockquote:rounded-r-lg",
          "prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5 prose-li:text-foreground",
          "prose-img:rounded-xl prose-img:border prose-img:shadow-sm prose-img:my-4",
          "prose-hr:border-border prose-hr:my-6",
          "prose-table:border-collapse prose-table:border prose-table:rounded-lg prose-table:overflow-hidden prose-table:text-sm",
          "prose-th:font-semibold prose-th:p-3 prose-th:border prose-th:bg-muted prose-th:border-border",
          "prose-td:p-3 prose-td:border prose-td:border-border",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function EmailTextRenderer({ text }: { text: string }) {
  return (
    <div className="px-6 py-6 md:px-8 md:py-8">
      <pre className="whitespace-pre-wrap font-sans text-sm md:text-base leading-relaxed text-foreground bg-muted/10 rounded-lg p-5 border min-h-[200px]">
        {text}
      </pre>
    </div>
  )
}
