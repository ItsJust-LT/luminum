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
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { MailboxId } from "@/components/emails/mailbox-sidebar"

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

export function MailComposeFullscreen(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  domain?: string
  /** Refetch list; pass mailbox to switch folder (e.g. after schedule or explicit draft save). */
  onRefresh: (opts?: { mailbox?: MailboxId }) => Promise<void>
}) {
  const { open, onOpenChange, organizationId, domain, onRefresh } = props
  const [mounted, setMounted] = useState(false)
  const [composeFromLocal, setComposeFromLocal] = useState("noreply")
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [sendingCompose, setSendingCompose] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => setMounted(true), [])

  const resetForm = useCallback(() => {
    setComposeFromLocal("noreply")
    setComposeTo("")
    setComposeSubject("")
    setComposeBody("")
    const now = new Date()
    setScheduleDate(localDateString(now))
    setScheduleTime(localTimeString(now))
  }, [])

  useEffect(() => {
    if (open) {
      resetForm()
      closingRef.current = false
    }
  }, [open, resetForm])

  const hasDraftableContent = useMemo(() => {
    return Boolean(
      composeTo.trim() ||
        composeSubject.trim() ||
        composeBody.trim() ||
        (composeFromLocal.trim() && composeFromLocal.trim() !== "noreply")
    )
  }, [composeTo, composeSubject, composeBody, composeFromLocal])

  const saveDraftQuietly = useCallback(async (): Promise<boolean> => {
    if (!organizationId || !hasDraftableContent) return true
    setSavingDraft(true)
    try {
      const to = composeTo.trim()
      const result = (await api.emails.saveDraft({
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        to: to ? [to] : [],
        subject: composeSubject.trim(),
        text: composeBody.trim(),
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
    composeBody,
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
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        void requestClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, requestClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const minDateStr = useMemo(() => localDateString(new Date()), [])
  const minTimeForDate = useMemo(() => {
    if (scheduleDate !== minDateStr) return "00:00"
    return localTimeString(new Date())
  }, [scheduleDate, minDateStr])

  const handleSendEmail = async () => {
    const to = composeTo.trim()
    const subject = composeSubject.trim()
    const text = composeBody.trim()
    if (!to || !subject || !text) return
    setSendingCompose(true)
    try {
      const result = (await api.post("/api/emails/send", {
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        to: [to],
        subject,
        text,
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
    const text = composeBody.trim()
    const when = combineLocalDateTime(scheduleDate, scheduleTime)
    if (!to || !subject || !text || !when) {
      toast.error("Fill all fields and pick a valid date and time.")
      return
    }
    if (when.getTime() <= Date.now()) {
      toast.error("Choose a time in the future.")
      return
    }
    setSendingCompose(true)
    try {
      const result = (await api.emails.scheduleSend({
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        to: [to],
        subject,
        text,
        scheduledSendAt: when.toISOString(),
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
      const result = (await api.emails.saveDraft({
        organizationId,
        fromLocalPart: composeFromLocal.trim(),
        to: to ? [to] : [],
        subject: composeSubject.trim(),
        text: composeBody.trim(),
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

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mail-compose"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mail-compose-title"
          className="fixed inset-0 z-[200] flex min-h-0 flex-col"
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
            className="relative z-10 flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-background md:mx-auto md:my-3 md:min-h-0 md:max-h-[calc(100dvh-1.5rem)] md:w-full md:max-w-[min(72rem,calc(100vw-2rem))] md:rounded-2xl md:border md:border-border/60 md:shadow-2xl lg:my-4"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/70 bg-gradient-to-r from-primary/[0.07] via-transparent to-transparent px-5 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0 space-y-1">
                <h2 id="mail-compose-title" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  New message
                </h2>
                <p className="text-sm text-muted-foreground">
                  Closing saves a draft if you have written anything. Press Esc to close.
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

            <Tabs defaultValue="send" className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border/60 px-5 pt-4 sm:px-6">
                <TabsList className="grid h-12 w-full max-w-xl grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
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
                <div className="mx-auto max-w-3xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</Label>
                    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
                      <Input
                        placeholder="noreply"
                        value={composeFromLocal}
                        onChange={(e) => setComposeFromLocal(e.target.value)}
                        className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <span className="shrink-0 truncate text-sm text-muted-foreground">@{domain ?? "…"}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mc-to" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      To
                    </Label>
                    <Input
                      id="mc-to"
                      placeholder="recipient@example.com"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      className="h-12 rounded-xl border-border/80 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mc-subject" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Subject
                    </Label>
                    <Input
                      id="mc-subject"
                      placeholder="What is this about?"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="h-12 rounded-xl border-border/80 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mc-body" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Message
                    </Label>
                    <Textarea
                      id="mc-body"
                      placeholder="Write your message…"
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      className="min-h-[min(50vh,320px)] rounded-xl border-border/80 text-[15px] leading-relaxed"
                    />
                  </div>

                  <TabsContent value="send" className="mt-0 space-y-4 outline-none">
                    <p className="text-sm text-muted-foreground">The message is sent immediately from your organization domain.</p>
                    <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-6 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="h-11 rounded-xl" onClick={() => void requestClose()} disabled={sendingCompose || savingDraft}>
                        Cancel
                      </Button>
                      <Button
                        className="h-11 rounded-xl shadow-md shadow-primary/15"
                        onClick={() => void handleSendEmail()}
                        disabled={sendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
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

                  <TabsContent value="schedule" className="mt-0 space-y-5 outline-none">
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
                      <div className="mb-4 flex items-center gap-2 text-foreground">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <span className="font-medium">When to send</span>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="mc-schedule-date" className="text-sm font-medium text-foreground">
                            Date
                          </Label>
                          <Input
                            id="mc-schedule-date"
                            type="date"
                            min={minDateStr}
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="h-12 rounded-xl border-border/80 bg-background text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mc-schedule-time" className="text-sm font-medium text-foreground">
                            Time
                          </Label>
                          <Input
                            id="mc-schedule-time"
                            type="time"
                            min={scheduleDate === minDateStr ? minTimeForDate : undefined}
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="h-12 rounded-xl border-border/80 bg-background text-base"
                          />
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-muted-foreground">Times use your device timezone ({tzName}).</p>
                      {schedulePreview ? (
                        <div
                          className={cn(
                            "mt-4 rounded-xl border px-4 py-3 text-sm",
                            combineLocalDateTime(scheduleDate, scheduleTime) &&
                              combineLocalDateTime(scheduleDate, scheduleTime)!.getTime() <= Date.now()
                              ? "border-amber-500/40 bg-amber-500/5 text-amber-950 dark:text-amber-100"
                              : "border-primary/20 bg-primary/5 text-foreground"
                          )}
                        >
                          <span className="font-medium">Sends: </span>
                          {schedulePreview}
                          {combineLocalDateTime(scheduleDate, scheduleTime) &&
                          combineLocalDateTime(scheduleDate, scheduleTime)!.getTime() <= Date.now() ? (
                            <span className="mt-1 block text-xs">Pick a future time to schedule.</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="h-11 rounded-xl" onClick={() => void requestClose()} disabled={sendingCompose || savingDraft}>
                        Cancel
                      </Button>
                      <Button
                        className="h-11 rounded-xl"
                        onClick={() => void handleScheduleSend()}
                        disabled={
                          sendingCompose ||
                          !composeTo.trim() ||
                          !composeSubject.trim() ||
                          !composeBody.trim() ||
                          !scheduleDate ||
                          !scheduleTime ||
                          (combineLocalDateTime(scheduleDate, scheduleTime)?.getTime() ?? 0) <= Date.now()
                        }
                      >
                        {sendingCompose ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                        Schedule send
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="draft" className="mt-0 space-y-4 outline-none">
                    <p className="text-sm text-muted-foreground">
                      Save without sending. You can open the message again from the Drafts folder.
                    </p>
                    <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-6 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="h-11 rounded-xl" onClick={() => void requestClose()} disabled={savingDraft}>
                        Cancel
                      </Button>
                      <Button variant="secondary" className="h-11 rounded-xl" onClick={() => void handleSaveDraftClick()} disabled={savingDraft}>
                        {savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileEdit className="mr-2 h-4 w-4" />}
                        Save draft
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
