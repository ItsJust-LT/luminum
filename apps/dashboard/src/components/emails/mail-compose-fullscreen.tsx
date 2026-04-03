"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Send,
  Clock,
  FileEdit,
  Loader2,
  X,
  CalendarDays,
  Paperclip,
  Type,
  Sparkles,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { MailboxId } from "@/components/emails/mailbox-sidebar"
import { MailRichEditor } from "@/components/emails/mail-rich-editor"
import { OUTBOUND_MAX_ATTACHMENT_BYTES } from "@/lib/email-compose-constants"

/** Matches API: scheduled send must be at least this far in the future. */
const SCHEDULE_MIN_LEAD_MS = 60_000

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function localDateString(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function localTimeString(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function combineLocalDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null
  const [y, mo, da] = dateStr.split("-").map(Number)
  const [h, mi] = timeStr.split(":").map(Number)
  if (!y || !mo || !da || h === undefined || mi === undefined) return null
  const d = new Date(y, mo - 1, da, h, mi, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatSchedulePreview(dateStr: string, timeStr: string): string | null {
  const d = combineLocalDateTime(dateStr, timeStr)
  if (!d) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d)
  } catch {
    return d.toLocaleString()
  }
}

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

type LocalAttachment = { id: string; file: File }

export function MailComposeFullscreen(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  domain?: string
  /** Refetch list; pass mailbox to switch folder (e.g. after schedule or explicit draft save). */
  onRefresh: (opts?: { mailbox?: MailboxId }) => Promise<void>
  /** Full-page compose (no modal / portal). */
  layoutMode?: "modal" | "page"
}) {
  const { open, onOpenChange, organizationId, domain, onRefresh, layoutMode = "modal" } = props
  const [mounted, setMounted] = useState(false)
  const [editorSession, setEditorSession] = useState(0)
  const [richMode, setRichMode] = useState(true)
  const [composeFromLocal, setComposeFromLocal] = useState("")
  const [composeReplyTo, setComposeReplyTo] = useState("")
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeHtml, setComposeHtml] = useState("")
  const [composePlain, setComposePlain] = useState("")
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [signatureHint, setSignatureHint] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [sendingCompose, setSendingCompose] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const closingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setMounted(true), [])

  const resetForm = useCallback(() => {
    setComposeFromLocal("noreply")
    setComposeReplyTo("")
    setComposeTo("")
    setComposeSubject("")
    setComposeBody("")
    setComposeHtml("")
    setComposePlain("")
    setAttachments([])
    setSignatureHint(null)
    setRichMode(true)
    const now = new Date()
    setScheduleDate(localDateString(now))
    setScheduleTime(localTimeString(now))
  }, [])

  useEffect(() => {
    if (!open && layoutMode !== "page") return
    closingRef.current = false
    resetForm()
    setEditorSession((s) => s + 1)
    void (async () => {
      try {
        const r = (await api.organizationSettings.getEmailComposer(organizationId)) as {
          success?: boolean
          data?: {
            organizationDefault?: {
              defaultFromLocal?: string
              signatureEnabled?: boolean
              signatureHtml?: string
              signatureText?: string
            }
            personal?: { signatureHtml?: string; signatureText?: string }
          }
        }
        if (r?.success && r.data) {
          const d = r.data.organizationDefault?.defaultFromLocal?.trim()
          setComposeFromLocal(d || "noreply")
          const org = r.data.organizationDefault
          const personalHas =
            Boolean(r.data.personal?.signatureHtml?.trim()) || Boolean(r.data.personal?.signatureText?.trim())
          const orgAllows = org?.signatureEnabled !== false
          const orgHas =
            Boolean(org?.signatureHtml?.trim()) || Boolean(org?.signatureText?.trim())
          if (orgAllows && personalHas) {
            setSignatureHint("Your personal signature will be appended when the message is sent (over the organization default).")
          } else if (orgAllows && orgHas) {
            setSignatureHint("The organization default signature will be appended when the message is sent.")
          }
        } else {
          setComposeFromLocal("noreply")
        }
      } catch {
        setComposeFromLocal("noreply")
      }
    })()
  }, [open, layoutMode, organizationId, resetForm])

  const hasBody = useMemo(() => {
    if (richMode) {
      const t = composePlain.replace(/\u00a0/g, " ").trim()
      const h = composeHtml.replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ").trim()
      return Boolean(t || h)
    }
    return Boolean(composeBody.trim())
  }, [richMode, composePlain, composeHtml, composeBody])

  const hasDraftableContent = useMemo(() => {
    return Boolean(
      composeTo.trim() ||
        composeSubject.trim() ||
        hasBody ||
        attachments.length > 0 ||
        (composeFromLocal.trim() && composeFromLocal.trim() !== "noreply") ||
        composeReplyTo.trim()
    )
  }, [composeTo, composeSubject, hasBody, attachments.length, composeFromLocal, composeReplyTo])

  const buildAttachmentsPayload = useCallback(async () => {
    const out: { filename: string; contentType: string; contentBase64: string }[] = []
    for (const a of attachments.slice(0, 10)) {
      if (a.file.size > OUTBOUND_MAX_ATTACHMENT_BYTES) {
        throw new Error(`"${a.file.name}" is larger than 8 MB`)
      }
      const contentBase64 = await readFileAsBase64(a.file)
      out.push({
        filename: a.file.name,
        contentType: a.file.type || "application/octet-stream",
        contentBase64,
      })
    }
    return out
  }, [attachments])

  const saveDraftQuietly = useCallback(async (): Promise<boolean> => {
    if (!organizationId || !hasDraftableContent) return true
    setSavingDraft(true)
    try {
      const to = composeTo.trim()
      const text = richMode ? composePlain.trim() : composeBody.trim()
      const html = richMode && composeHtml.trim() ? composeHtml.trim() : undefined
      const result = (await api.emails.saveDraft({
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        to: to ? [to] : [],
        subject: composeSubject.trim(),
        text,
        html,
      })) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Draft save failed")
      toast.success("Saved as draft")
      await onRefresh()
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save draft")
      return false
    } finally {
      setSavingDraft(false)
    }
  }, [
    organizationId,
    hasDraftableContent,
    composeTo,
    composeFromLocal,
    composeSubject,
    richMode,
    composePlain,
    composeBody,
    composeHtml,
    onRefresh,
  ])

  const requestClose = useCallback(async () => {
    if (closingRef.current) return
    closingRef.current = true
    const saved = await saveDraftQuietly()
    if (!saved) {
      closingRef.current = false
      return
    }
    resetForm()
    onOpenChange(false)
    closingRef.current = false
  }, [saveDraftQuietly, resetForm, onOpenChange])

  useEffect(() => {
    if (!open && layoutMode !== "page") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layoutMode === "modal") {
        e.preventDefault()
        void requestClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, layoutMode, requestClose])

  useEffect(() => {
    if (!open || layoutMode === "page") return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, layoutMode])

  const minDateStr = useMemo(() => localDateString(new Date()), [])
  const minTimeForDate = useMemo(() => {
    if (scheduleDate !== minDateStr) return "00:00"
    return localTimeString(new Date())
  }, [scheduleDate, minDateStr])

  const handleAttachmentsPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const next: LocalAttachment[] = []
    for (let i = 0; i < files.length && attachments.length + next.length < 10; i++) {
      const f = files[i]
      if (f.size > OUTBOUND_MAX_ATTACHMENT_BYTES) {
        toast.error(`"${f.name}" exceeds 8 MB`)
        continue
      }
      next.push({ id: `${Date.now()}-${i}-${f.name}`, file: f })
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 10))
    e.target.value = ""
  }

  const handleSendEmail = async () => {
    const to = composeTo.trim()
    const subject = composeSubject.trim()
    const text = richMode ? composePlain.trim() : composeBody.trim()
    const html = richMode && composeHtml.trim() ? composeHtml.trim() : undefined
    if (!to || !subject || (!text && !html)) return
    setSendingCompose(true)
    try {
      const att = await buildAttachmentsPayload()
      const result = (await api.emails.send({
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        replyTo: composeReplyTo.trim() || undefined,
        to: [to],
        subject,
        text: text || "",
        html,
        attachments: att.length ? att : undefined,
      })) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Failed to send email")
      toast.success("Email sent")
      resetForm()
      onOpenChange(false)
      await onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email")
    } finally {
      setSendingCompose(false)
    }
  }

  const handleScheduleSend = async () => {
    const to = composeTo.trim()
    const subject = composeSubject.trim()
    const text = richMode ? composePlain.trim() : composeBody.trim()
    const html = richMode && composeHtml.trim() ? composeHtml.trim() : undefined
    const when = combineLocalDateTime(scheduleDate, scheduleTime)
    if (!to || !subject || (!text && !html) || !when) {
      toast.error("Fill all fields and pick a valid date and time.")
      return
    }
    if (when.getTime() < Date.now() + SCHEDULE_MIN_LEAD_MS) {
      toast.error("Choose a date and time at least one minute from now.")
      return
    }
    setSendingCompose(true)
    try {
      const att = await buildAttachmentsPayload()
      const result = (await api.emails.scheduleSend({
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        replyTo: composeReplyTo.trim() || undefined,
        to: [to],
        subject,
        text: text || "",
        html,
        scheduledSendAt: when.toISOString(),
        attachments: att.length ? att : undefined,
      })) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Schedule failed")
      toast.success("Email scheduled")
      resetForm()
      onOpenChange(false)
      await onRefresh({ mailbox: "scheduled" })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schedule failed")
    } finally {
      setSendingCompose(false)
    }
  }

  const handleSaveDraftClick = async () => {
    if (!organizationId) return
    setSavingDraft(true)
    try {
      const to = composeTo.trim()
      const text = richMode ? composePlain.trim() : composeBody.trim()
      const html = richMode && composeHtml.trim() ? composeHtml.trim() : undefined
      const result = (await api.emails.saveDraft({
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        to: to ? [to] : [],
        subject: composeSubject.trim(),
        text,
        html,
      })) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Draft save failed")
      toast.success("Draft saved")
      resetForm()
      onOpenChange(false)
      await onRefresh({ mailbox: "drafts" })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft save failed")
    } finally {
      setSavingDraft(false)
    }
  }

  const schedulePreview = formatSchedulePreview(scheduleDate, scheduleTime)
  const tzName = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return "local time"
    }
  }, [])

  const toggleRichMode = (next: boolean) => {
    if (next === richMode) return
    if (next) {
      const lines = composeBody.trim().split("\n")
      const wrapped = lines.length ? lines.map((l) => `<p>${l || "<br/>"}</p>`).join("") : "<p></p>"
      setComposeHtml(wrapped)
      setComposePlain(composeBody.trim())
      setEditorSession((s) => s + 1)
    } else {
      setComposeBody(composePlain.trim() || composeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    }
    setRichMode(next)
  }

  if (!mounted) return null

  const composeHeader =
    layoutMode === "page" ? (
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 rounded-lg gap-1.5"
            onClick={() => void requestClose()}
            disabled={savingDraft}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h2 id="mail-compose-title" className="text-lg font-semibold tracking-tight text-foreground sm:text-xl truncate">
              New message
            </h2>
            <p className="text-xs text-muted-foreground">Unsaved content can be saved as a draft from the Draft tab.</p>
          </div>
        </div>
      </header>
    ) : (
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent px-4 py-3 sm:px-5">
        <div className="min-w-0 space-y-0.5">
          <h2 id="mail-compose-title" className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            New message
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Esc or backdrop closes · unsaved content becomes a draft
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          onClick={() => void requestClose()}
          disabled={savingDraft}
        >
          {savingDraft ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
          <span className="sr-only">Close</span>
        </Button>
      </header>
    )

  const composeShell = (
    <div
      className={
        layoutMode === "page"
          ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm"
          : "relative z-10 flex max-h-[min(92dvh,620px)] w-full max-w-[min(56rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background shadow-2xl sm:rounded-2xl sm:max-h-[min(88dvh,600px)]"
      }
    >
      {composeHeader}

            <Tabs defaultValue="send" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-border/60 px-4 pt-3 sm:px-5">
                <TabsList className="grid h-10 w-full max-w-xl grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
                  <TabsTrigger value="send" className="rounded-lg text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Send className="h-4 w-4 opacity-80" />
                    Send
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="rounded-lg text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Clock className="h-4 w-4 opacity-80" />
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger value="draft" className="rounded-lg text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <FileEdit className="h-4 w-4 opacity-80" />
                    Draft
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[46rem] space-y-3 px-4 py-4 sm:px-5">
                  <div className="space-y-3 min-w-0">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From</Label>
                        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/80 bg-muted/25 px-3 py-2">
                          <Input
                            placeholder="noreply"
                            value={composeFromLocal}
                            onChange={(e) => setComposeFromLocal(e.target.value)}
                            className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <span className="shrink-0 truncate text-xs text-muted-foreground">@{domain ?? "…"}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="mc-to" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          To
                        </Label>
                        <Input
                          id="mc-to"
                          placeholder="recipient@example.com"
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          className="h-9 rounded-lg border-border/80 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mc-reply-to" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Reply-To
                      </Label>
                      <Input
                        id="mc-reply-to"
                        type="email"
                        placeholder="Leave blank to use the same address as From"
                        value={composeReplyTo}
                        onChange={(e) => setComposeReplyTo(e.target.value)}
                        className="h-9 rounded-lg border-border/80 text-sm font-mono"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Where recipients&apos; mail clients send replies. Defaults to your From mailbox if empty.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mc-subject" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Subject
                      </Label>
                      <Input
                        id="mc-subject"
                        placeholder="What is this about?"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="h-9 rounded-lg border-border/80 text-sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={richMode ? "secondary" : "outline"}
                        size="sm"
                        className="h-8 rounded-lg gap-1.5"
                        onClick={() => toggleRichMode(true)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Rich
                      </Button>
                      <Button
                        type="button"
                        variant={!richMode ? "secondary" : "outline"}
                        size="sm"
                        className="h-8 rounded-lg gap-1.5"
                        onClick={() => toggleRichMode(false)}
                      >
                        <Type className="h-3.5 w-3.5" />
                        Plain
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleAttachmentsPick}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attachments.length >= 10}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Attach {attachments.length > 0 ? `(${attachments.length})` : ""}
                      </Button>
                    </div>

                    {attachments.length > 0 ? (
                      <ul className="flex flex-wrap gap-2 text-xs">
                        {attachments.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-1"
                          >
                            <span className="max-w-[200px] truncate">{a.file.name}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Remove attachment"
                              onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="space-y-1.5">
                      <Label htmlFor="mc-body" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Message
                      </Label>
                      {richMode ? (
                        <MailRichEditor
                          sessionKey={editorSession}
                          initialHtml={composeHtml || "<p></p>"}
                          disabled={sendingCompose || savingDraft}
                          onChange={(html, plain) => {
                            setComposeHtml(html)
                            setComposePlain(plain)
                          }}
                        />
                      ) : (
                        <Textarea
                          id="mc-body"
                          placeholder="Write your message…"
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          className="min-h-[7.5rem] max-h-[min(28vh,200px)] resize-y rounded-lg border-border/80 text-[14px] leading-relaxed"
                        />
                      )}
                      {signatureHint ? <p className="text-[11px] text-primary/90">{signatureHint}</p> : null}
                    </div>
                  </div>

                  <TabsContent value="send" className="mt-0 space-y-3 outline-none">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Sends immediately from your organization domain. Inline images and attachments are supported.
                    </p>
                    <div className="flex flex-col-reverse gap-2 border-t border-border/50 pt-4 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="h-10 rounded-lg" onClick={() => void requestClose()} disabled={sendingCompose || savingDraft}>
                        Cancel
                      </Button>
                      <Button
                        className="h-10 rounded-lg shadow-md shadow-primary/15"
                        onClick={() => void handleSendEmail()}
                        disabled={sendingCompose || !composeTo.trim() || !composeSubject.trim() || !hasBody}
                      >
                        {sendingCompose ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send now
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="schedule" className="mt-0 space-y-3 outline-none">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
                      <div className="mb-3 flex items-center gap-2 text-foreground">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">When to send</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="mc-schedule-date" className="text-xs font-medium text-foreground">
                            Date
                          </Label>
                          <Input
                            id="mc-schedule-date"
                            type="date"
                            min={minDateStr}
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="h-9 rounded-lg border-border/80 bg-background text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="mc-schedule-time" className="text-xs font-medium text-foreground">
                            Time
                          </Label>
                          <Input
                            id="mc-schedule-time"
                            type="time"
                            min={scheduleDate === minDateStr ? minTimeForDate : undefined}
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="h-9 rounded-lg border-border/80 bg-background text-sm"
                          />
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">Timezone: {tzName}</p>
                      {schedulePreview ? (
                        <div
                          className={cn(
                            "mt-4 rounded-xl border px-4 py-3 text-sm",
                            combineLocalDateTime(scheduleDate, scheduleTime) &&
                              combineLocalDateTime(scheduleDate, scheduleTime)!.getTime() <
                                Date.now() + SCHEDULE_MIN_LEAD_MS
                              ? "border-amber-500/40 bg-amber-500/5 text-amber-950 dark:text-amber-100"
                              : "border-primary/20 bg-primary/5 text-foreground"
                          )}
                        >
                          <span className="font-medium">Sends: </span>
                          {schedulePreview}
                          {combineLocalDateTime(scheduleDate, scheduleTime) &&
                          combineLocalDateTime(scheduleDate, scheduleTime)!.getTime() <
                            Date.now() + SCHEDULE_MIN_LEAD_MS ? (
                            <span className="mt-1 block text-xs">Pick a time at least one minute from now.</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col-reverse gap-2 border-t border-border/50 pt-3 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="h-10 rounded-lg" onClick={() => void requestClose()} disabled={sendingCompose || savingDraft}>
                        Cancel
                      </Button>
                      <Button
                        className="h-10 rounded-lg"
                        onClick={() => void handleScheduleSend()}
                        disabled={
                          sendingCompose ||
                          !composeTo.trim() ||
                          !composeSubject.trim() ||
                          !hasBody ||
                          !scheduleDate ||
                          !scheduleTime ||
                          (combineLocalDateTime(scheduleDate, scheduleTime)?.getTime() ?? 0) <
                          Date.now() + SCHEDULE_MIN_LEAD_MS
                        }
                      >
                        {sendingCompose ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                        Schedule send
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="draft" className="mt-0 space-y-3 outline-none">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Save without sending. Open again from Drafts.
                    </p>
                    <div className="flex flex-col-reverse gap-2 border-t border-border/50 pt-4 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="h-10 rounded-lg" onClick={() => void requestClose()} disabled={savingDraft}>
                        Cancel
                      </Button>
                      <Button variant="secondary" className="h-10 rounded-lg" onClick={() => void handleSaveDraftClick()} disabled={savingDraft}>
                        {savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileEdit className="mr-2 h-4 w-4" />}
                        Save draft
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
    </div>
  )

  if (layoutMode === "page") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background/30 px-3 py-3 sm:px-5 sm:py-4">
        {composeShell}
      </div>
    )
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mail-compose"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mail-compose-title"
          className="fixed inset-0 z-[200] flex min-h-0 items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Close and save draft"
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => void requestClose()}
          />
          <motion.div
            className="relative z-10 w-full max-w-[min(56rem,calc(100vw-1.25rem))] flex justify-center"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {composeShell}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
