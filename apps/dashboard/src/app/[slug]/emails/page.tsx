"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useEmailsContext } from "@/lib/contexts/emails-context"
import type { EmailListItem } from "@/lib/contexts/emails-context"
import { api } from "@/lib/api"
import type { EmailSetupStatus } from "@/lib/types/emails"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Mail,
  Send,
  Search,
  Trash2,
  Check,
  ChevronsUpDown,
  X,
  Inbox,
  MailOpen,
  Paperclip,
  RefreshCw,
  InboxIcon,
  CheckCircle2,
  Loader2,
  XCircle,
  Star,
  Clock,
  FileEdit,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmailAvatar } from "@/components/emails/email-avatar"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MailboxSidebar, type MailboxId, type FolderCounts } from "@/components/emails/mailbox-sidebar"

function smartDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : new Date(date)
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined })
}

export default function EmailsPage() {
  const { organization, userRole } = useOrganization()
  const ctx = useEmailsContext()
  const {
    emails,
    setEmails,
    loading,
    setLoading,
    loadingMore,
    setLoadingMore,
    page,
    setPage,
    hasMore,
    setHasMore,
    totalCount,
    setTotalCount,
    unreadCountFromApi,
    setUnreadCountFromApi,
    filterRead,
    setFilterRead,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    setDebouncedSearch,
    selectedEmailAddresses,
    setSelectedEmailAddresses,
    availableEmailAddresses,
    setAvailableEmailAddresses,
    scrollPosition,
    saveScrollPosition,
    clearScrollPosition,
    hasCachedList,
    setLoadedForOrgId,
  } = ctx
  const [orgLoading, setOrgLoading] = useState(false)
  const [emailSelectorOpen, setEmailSelectorOpen] = useState(false)
  const [setupStatus, setSetupStatus] = useState<EmailSetupStatus | null>(null)
  const [websites, setWebsites] = useState<{ id: string; domain: string; name?: string }[]>([])
  const [settingDomain, setSettingDomain] = useState(false)
  const [verifyingDns, setVerifyingDns] = useState(false)
  const [lastVerifyResult, setLastVerifyResult] = useState<{
    success: boolean
    error?: string
    message?: string
    checks?: {
      spf: { ok: boolean; record?: string; error?: string }
      dmarc: { ok: boolean; record?: string; error?: string }
      resend?: { ok: boolean }
    }
  } | null>(null)
  const [resendApiKeyInput, setResendApiKeyInput] = useState("")
  const [resendWebhookSecretInput, setResendWebhookSecretInput] = useState("")
  const [savingResendCreds, setSavingResendCreds] = useState(false)
  const [maskedResendKey, setMaskedResendKey] = useState<string | null>(null)
  const [mailbox, setMailbox] = useState<MailboxId>("inbox")
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({
    inboxUnread: 0,
    sent: 0,
    starred: 0,
    drafts: 0,
    scheduled: 0,
  })
  const [composeOpen, setComposeOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState("")
  const [savingDraft, setSavingDraft] = useState(false)
  /** Local part only; server appends @org domain */
  const [composeFromLocal, setComposeFromLocal] = useState("noreply")
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [sendingCompose, setSendingCompose] = useState(false)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const lastPrefetchedIdRef = useRef<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery, setDebouncedSearch])

  useEffect(() => {
    if (!organization?.id) return
    api.emails.getSetupStatus(organization.id).then((s) => setSetupStatus(s as EmailSetupStatus))
  }, [organization?.id])

  useEffect(() => {
    if (!organization?.id || !setupStatus?.domain) {
      setMaskedResendKey(null)
      return
    }
    api.organizationSettings
      .getResendEmail(organization.id)
      .then((r: { success?: boolean; maskedApiKey?: string | null }) => {
        setMaskedResendKey(r?.maskedApiKey ?? null)
      })
      .catch(() => setMaskedResendKey(null))
  }, [organization?.id, setupStatus?.domain, setupStatus?.resend?.configured])

  const refreshFolderCounts = useCallback(async () => {
    if (!organization?.id) return
    try {
      const r = (await api.emails.folderCounts(organization.id)) as {
        success?: boolean
        data?: FolderCounts
      }
      if (r?.success && r.data) setFolderCounts(r.data)
    } catch {
      /* ignore */
    }
  }, [organization?.id])

  useEffect(() => {
    if (!organization?.id || !setupStatus?.setupComplete) return
    void refreshFolderCounts()
  }, [organization?.id, setupStatus?.setupComplete, refreshFolderCounts])

  // When setup required and no domain, fetch websites so owner/admin can select one
  useEffect(() => {
    if (!organization?.id || !setupStatus || setupStatus.setupComplete || setupStatus.domain) return
    const canSetDomain = userRole === "owner" || userRole === "admin"
    if (!canSetDomain) return
    api.websites.list(organization.id).then((res: any) => {
      if (res?.data?.length) setWebsites(res.data)
    })
  }, [organization?.id, setupStatus, userRole])

  const router = useRouter()
  const showSetupRequired = !!(setupStatus && !setupStatus.setupComplete)

  const fetchEmails = useCallback(
    async (pageNum: number, refresh: boolean, opts?: { mailbox?: MailboxId }) => {
      if (!organization?.id) return
      const mb = opts?.mailbox ?? mailbox
      if (refresh) setLoading(true)
      else setLoadingMore(true)
      try {
        const result = await api.emails.list(
          organization.id,
          pageNum,
          50,
          {
            mailbox: mb,
            read: filterRead,
            emailAddresses: selectedEmailAddresses.length > 0 ? selectedEmailAddresses : undefined,
            search: debouncedSearch || undefined,
          }
        )
        if (result.success && result.data) {
          const fetchedEmails = (result.data.emails as EmailListItem[]).map((e) => ({
            ...e,
            date: e.date ? new Date(e.date as unknown as string) : new Date(),
            createdAt: e.createdAt ? new Date(e.createdAt as unknown as string) : new Date(),
            updatedAt: e.updatedAt ? new Date(e.updatedAt as unknown as string) : undefined,
          }))
          const pagination = result.data.pagination as {
            hasMore: boolean
            total: number
            unreadCount?: number | null
            inboxUnread?: number
          }
          setHasMore(pagination.hasMore)
          setTotalCount(pagination.total)
          if (typeof pagination.inboxUnread === "number") {
            setFolderCounts((prev) => ({ ...prev, inboxUnread: pagination.inboxUnread! }))
            setUnreadCountFromApi(pagination.inboxUnread)
          } else {
            setUnreadCountFromApi(mb === "inbox" ? pagination.unreadCount ?? null : null)
          }
          setOrgLoading(false)
          if (refresh) setEmails(fetchedEmails)
          else setEmails((prev) => [...prev, ...fetchedEmails])
          if (refresh) setLoadedForOrgId(organization.id)
        } else {
          toast.error(result.error || "Failed to fetch emails")
        }
        const emailAddressesResult = await api.emails.getAddresses(organization.id)
        if (emailAddressesResult.success && Array.isArray(emailAddressesResult.emailAddresses)) {
          setAvailableEmailAddresses(emailAddressesResult.emailAddresses)
        } else {
          setAvailableEmailAddresses([])
        }
      } catch {
        toast.error("Failed to fetch emails")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [
      organization?.id,
      mailbox,
      filterRead,
      selectedEmailAddresses,
      debouncedSearch,
      setEmails,
      setLoading,
      setLoadingMore,
      setHasMore,
      setTotalCount,
      setUnreadCountFromApi,
      setAvailableEmailAddresses,
      setLoadedForOrgId,
    ],
  )

  const loadMore = useCallback(() => {
    if (!organization?.id || loadingMore || !hasMore) return
    fetchEmails(page + 1, false)
    setPage((p) => p + 1)
  }, [page, fetchEmails, organization?.id, loadingMore, hasMore])

  const handleEmailClick = useCallback(
    (email: EmailListItem) => {
      if (!organization?.slug) return
      const viewport = listContainerRef.current?.querySelector<HTMLDivElement>("[data-slot=scroll-area-viewport]")
      if (viewport) saveScrollPosition(viewport.scrollTop)
      router.push(`/${organization.slug}/emails/${email.id}`)
    },
    [router, organization?.slug, saveScrollPosition],
  )

  const handleEmailHover = useCallback(
    (emailId: string) => {
      if (!organization?.slug) return
      if (lastPrefetchedIdRef.current === emailId) return
      lastPrefetchedIdRef.current = emailId
      router.prefetch(`/${organization.slug}/emails/${emailId}`)
    },
    [router, organization?.slug],
  )

  const handleDeleteEmail = useCallback(
    (e: React.MouseEvent, emailId: string) => {
      e.stopPropagation()
      void api.emails.delete(emailId)
      setEmails((prev) => prev.filter((email) => email.id !== emailId))
      void refreshFolderCounts()
    },
    [setEmails, refreshFolderCounts],
  )

  const handleMarkAllAsRead = useCallback(async () => {
    if (!organization?.id) return
    try {
      const result = await api.emails.markAllAsRead(organization.id) as { success?: boolean; updated?: number; error?: string }
      if (!result?.success) throw new Error(result?.error || "Failed to mark all as read")
      setEmails((prev) => prev.map((email) => ({ ...email, read: true })))
      setUnreadCountFromApi(0)
      toast.success(
        result.updated && result.updated > 0
          ? `Marked ${result.updated} email${result.updated === 1 ? "" : "s"} as read`
          : "All emails are already read"
      )
      setFolderCounts((prev) => ({ ...prev, inboxUnread: 0 }))
      void refreshFolderCounts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark all as read")
    }
  }, [organization?.id, setEmails, setUnreadCountFromApi, refreshFolderCounts])

  const toggleStar = useCallback(
    async (e: React.MouseEvent, email: EmailListItem) => {
      e.stopPropagation()
      if (!organization?.id) return
      const next = !email.starred
      setEmails((prev) => {
        if (mailbox === "starred" && !next) return prev.filter((x) => x.id !== email.id)
        return prev.map((x) => (x.id === email.id ? { ...x, starred: next } : x))
      })
      try {
        await api.emails.patchMeta(email.id, { starred: next })
        await refreshFolderCounts()
      } catch {
        setEmails((prev) =>
          prev.some((x) => x.id === email.id)
            ? prev.map((x) => (x.id === email.id ? { ...x, starred: email.starred } : x))
            : [{ ...email, starred: email.starred }, ...prev],
        )
        toast.error("Could not update star")
      }
    },
    [organization?.id, setEmails, refreshFolderCounts, mailbox],
  )

  const mailboxTitle = useMemo(() => {
    const labels: Record<MailboxId, string> = {
      inbox: "Inbox",
      sent: "Sent",
      starred: "Starred",
      drafts: "Drafts",
      scheduled: "Scheduled",
    }
    return labels[mailbox]
  }, [mailbox])

  const emptyMailboxHint = useMemo(() => {
    const hints: Record<MailboxId, string> = {
      inbox: "Emails sent to your organization will appear here.",
      sent: "Outbound messages show here after you send.",
      starred: "Star an email from any folder to collect it here.",
      drafts: "Save a draft from compose to continue later.",
      scheduled: "Schedule a send from compose to queue it here.",
    }
    return hints[mailbox]
  }, [mailbox])

  const extractPreview = useCallback((email: EmailListItem) => {
    if (email.textBody) return email.textBody.slice(0, 120).replace(/\s+/g, " ").trim() + (email.textBody.length > 120 ? "…" : "")
    return ""
  }, [])

  // Fetch when org or filters change; skip when setup not complete or when we have cached list (e.g. returning from detail)
  const shouldFetchInbox = setupStatus != null && setupStatus.setupComplete === true
  useEffect(() => {
    if (!organization?.id || !shouldFetchInbox) return
    if (hasCachedList(organization.id) && scrollPosition != null && mailbox === "inbox") return
    setPage(1)
    fetchEmails(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit scrollPosition so clearing it after restore doesn't refetch
  }, [organization?.id, shouldFetchInbox, mailbox, filterRead, debouncedSearch, selectedEmailAddresses, fetchEmails, hasCachedList, scrollPosition, setPage])

  // Restore scroll position when returning from email detail (after paint so viewport exists)
  useEffect(() => {
    if (scrollPosition == null) return
    const id = setTimeout(() => {
      const viewport = listContainerRef.current?.querySelector<HTMLDivElement>("[data-slot=scroll-area-viewport]")
      if (viewport) {
        viewport.scrollTop = scrollPosition
        clearScrollPosition()
      }
    }, 0)
    return () => clearTimeout(id)
  }, [scrollPosition, clearScrollPosition])

  useOrganizationChannel(
    organization?.id || null,
    useCallback(
      (eventType: string, data: any) => {
        const refetch = () => {
          setPage(1)
          fetchEmails(1, true)
          void refreshFolderCounts()
        }
        switch (eventType) {
          case OrganizationEvents.EMAIL_CREATED:
            refetch()
            break
          case OrganizationEvents.EMAIL_READ:
            setEmails((prev) =>
              prev.map((email) => (email.id === data.emailId ? { ...email, read: true } : email)),
            )
            setUnreadCountFromApi((prev) => (prev != null ? Math.max(0, prev - 1) : null))
            void refreshFolderCounts()
            break
          case OrganizationEvents.EMAIL_UPDATED:
            setEmails((prev) =>
              prev.map((email) =>
                email.id === data.emailId
                  ? {
                      ...email,
                      ...(typeof data.read === "boolean" ? { read: data.read } : {}),
                      ...(typeof data.starred === "boolean" ? { starred: data.starred } : {}),
                    }
                  : email
              )
            )
            if (typeof data.read === "boolean") void refreshFolderCounts()
            if (typeof data.starred === "boolean") void refreshFolderCounts()
            break
          case OrganizationEvents.EMAIL_DELETED:
            setEmails((prev) => {
              const removed = prev.find((e) => e.id === data.emailId)
              if (removed && !removed.read)
                setUnreadCountFromApi((u) => (u != null ? Math.max(0, u - 1) : null))
              return prev.filter((email) => email.id !== data.emailId)
            })
            setTotalCount((prev) => (prev != null ? Math.max(0, prev - 1) : null))
            void refreshFolderCounts()
            break
        }
      },
      [fetchEmails, setEmails, setPage, setUnreadCountFromApi, setTotalCount, refreshFolderCounts],
    ),
  )

  // Infinite scroll: load more when sentinel enters viewport (must run before any conditional return to satisfy Rules of Hooks)
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return
    const el = loadMoreSentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: "200px", threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadMore])

  if (!organization) return null

  // Wait for setup status before showing inbox or setup-required (avoid flash of wrong view)
  if (setupStatus == null) {
    return (
      <AppPageContainer fullWidth>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Checking email setup…</p>
          </div>
        </div>
      </AppPageContainer>
    )
  }

  if (setupStatus.emailSystemUnavailable) {
    return (
      <AppPageContainer fullWidth>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="app-card w-full max-w-md border border-border">
            <CardContent className="pt-6 px-6 pb-6 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Email unavailable</h3>
              <p className="text-muted-foreground mb-4">
                {setupStatus.error ||
                  "Email is not available at this time. Please try again later or contact support if you need assistance."}
              </p>
              <Button onClick={() => router.push(`/${organization.slug}/dashboard`)} variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppPageContainer>
    )
  }

  // Route guard: emails feature not enabled (direct URL access blocked)
  if (setupStatus.access === false) {
    return (
      <AppPageContainer fullWidth>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="app-card w-full max-w-md border border-border">
            <CardContent className="pt-6 px-6 pb-6 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Emails not enabled</h3>
              <p className="text-muted-foreground mb-4">
                Emails is not enabled for this organization. Contact an administrator if you need access.
              </p>
              <Button onClick={() => router.push(`/${organization.slug}/dashboard`)} variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppPageContainer>
    )
  }

  const displayTotal = totalCount ?? emails.length
  const displayUnread =
    mailbox === "inbox"
      ? (unreadCountFromApi ?? folderCounts.inboxUnread)
      : emails.filter((e) => !e.read).length

  const handleSendEmail = async () => {
    const to = composeTo.trim()
    const subject = composeSubject.trim()
    const text = composeBody.trim()
    if (!organization?.id || !to || !subject || !text) return
    setSendingCompose(true)
    try {
      const result = await api.post("/api/emails/send", {
        organizationId: organization.id,
        fromLocalPart: composeFromLocal.trim(),
        to: [to],
        subject,
        text,
      }) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Failed to send email")
      toast.success("Email sent")
      setComposeOpen(false)
      setComposeFromLocal("noreply")
      setComposeTo("")
      setComposeSubject("")
      setComposeBody("")
      setScheduleAt("")
      setPage(1)
      await fetchEmails(1, true)
      await refreshFolderCounts()
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
    if (!organization?.id || !to || !subject || !text || !scheduleAt) {
      toast.error("Fill all fields and pick a send time.")
      return
    }
    const when = new Date(scheduleAt)
    if (Number.isNaN(when.getTime())) {
      toast.error("Invalid date")
      return
    }
    setSendingCompose(true)
    try {
      const result = (await api.emails.scheduleSend({
        organizationId: organization.id,
        fromLocalPart: composeFromLocal.trim(),
        to: [to],
        subject,
        text,
        scheduledSendAt: when.toISOString(),
      })) as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || "Schedule failed")
      toast.success("Email scheduled")
      setComposeOpen(false)
      setComposeTo("")
      setComposeSubject("")
      setComposeBody("")
      setScheduleAt("")
      setEmails([])
      setMailbox("scheduled")
      setPage(1)
      setLoadedForOrgId(null)
      await fetchEmails(1, true, { mailbox: "scheduled" })
      await refreshFolderCounts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schedule failed")
    } finally {
      setSendingCompose(false)
    }
  }

  const handleSaveDraftCompose = async () => {
    if (!organization?.id) return
    setSavingDraft(true)
    try {
      const to = composeTo.trim()
      const result = (await api.emails.saveDraft({
        organizationId: organization.id,
        fromLocalPart: composeFromLocal.trim(),
        to: to ? [to] : [],
        subject: composeSubject.trim(),
        text: composeBody.trim(),
      })) as { success?: boolean; error?: string; data?: { id: string } }
      if (!result?.success) throw new Error(result?.error || "Draft save failed")
      toast.success("Draft saved")
      setComposeOpen(false)
      setEmails([])
      setMailbox("drafts")
      setPage(1)
      setLoadedForOrgId(null)
      await fetchEmails(1, true, { mailbox: "drafts" })
      await refreshFolderCounts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft save failed")
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSaveResendCredentials = async () => {
    if (!organization?.id) return
    const key = resendApiKeyInput.trim()
    const wh = resendWebhookSecretInput.trim()
    if (!key || !wh) {
      toast.error("Resend API key and webhook signing secret are required.")
      return
    }
    setSavingResendCreds(true)
    try {
      const res = (await api.organizationSettings.setResendEmail(organization.id, key, wh)) as {
        success?: boolean
        error?: string
        message?: string
      }
      if (!res?.success) throw new Error(res?.error || "Failed to save credentials")
      toast.success(res?.message || "Resend credentials saved.")
      setResendApiKeyInput("")
      setResendWebhookSecretInput("")
      const next = await api.emails.getSetupStatus(organization.id)
      setSetupStatus(next as EmailSetupStatus)
      const rs = (await api.organizationSettings.getResendEmail(organization.id)) as { maskedApiKey?: string | null }
      setMaskedResendKey(rs?.maskedApiKey ?? null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save credentials")
    } finally {
      setSavingResendCreds(false)
    }
  }

  if (showSetupRequired) {
    const hasDomain = !!setupStatus?.domain
    const canSetDomain = userRole === "owner" || userRole === "admin"

    const handleSelectDomain = async (websiteId: string) => {
      if (!organization?.id) return
      setSettingDomain(true)
      try {
        const res = await api.emails.setupDomain(organization.id, websiteId)
        if (res?.success) {
          toast.success("Domain set. Configure the domain in Resend, then add API key and webhook secret.")
          const next = await api.emails.getSetupStatus(organization.id)
          setSetupStatus(next)
        } else {
          toast.error((res as { error?: string })?.error || "Failed to set domain")
        }
      } catch {
        toast.error("Failed to set domain")
      } finally {
        setSettingDomain(false)
      }
    }

    const handleVerifyDns = async () => {
      if (!organization?.id) return
      setVerifyingDns(true)
      setLastVerifyResult(null)
      try {
        const res = await api.emails.verifyDns(organization.id) as {
          success?: boolean
          error?: string
          message?: string
          checks?: {
            spf: { ok: boolean; record?: string; error?: string }
            dmarc: { ok: boolean; record?: string; error?: string }
            resend?: { ok: boolean }
          }
        }
        setLastVerifyResult({
          success: !!res?.success,
          error: res?.error,
          message: res?.message,
          checks: res?.checks,
        })
        if (res?.success) {
          toast.success(res?.message || "DNS verified. You can send and receive email.")
          const next = await api.emails.getSetupStatus(organization.id)
          setSetupStatus(next)
        } else {
          toast.error(res?.error || "DNS check failed. See results below.")
          const next = await api.emails.getSetupStatus(organization.id)
          setSetupStatus(next)
        }
      } catch {
        toast.error("Verification failed")
        setLastVerifyResult({ success: false, error: "Verification failed" })
        const next = await api.emails.getSetupStatus(organization.id)
        setSetupStatus(next)
      } finally {
        setVerifyingDns(false)
      }
    }

    return (
      <AppPageContainer fullWidth>
        <div className="relative overflow-hidden app-hero bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/10 p-4 sm:p-6 md:p-8">
          <div className="relative space-y-4 max-w-2xl">
            <h1 className="text-2xl font-bold text-foreground">Email setup required</h1>
            {!hasDomain ? (
              <>
                <p className="text-muted-foreground">
                  Complete setup so this organization can receive and send email. Select the domain you’ll use for email, then add the MX record and verify.
                </p>
                {canSetDomain ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Select email domain</label>
                    <div className="flex flex-wrap gap-2">
                      {websites.length === 0 && !settingDomain && (
                        <p className="text-sm text-muted-foreground">Loading websites…</p>
                      )}
                      {websites.length === 0 && settingDomain && (
                        <p className="text-sm text-muted-foreground">Setting domain…</p>
                      )}
                      {websites.map((w) => (
                        <Button
                          key={w.id}
                          variant="outline"
                          size="sm"
                          disabled={settingDomain}
                          onClick={() => handleSelectDomain(w.id)}
                          className="rounded-lg"
                        >
                          {settingDomain ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {w.domain}
                        </Button>
                      ))}
                    </div>
                    {websites.length === 0 && !settingDomain && (
                      <p className="text-sm text-muted-foreground">Add a website in Analytics first to use its domain for email.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ask an owner or admin to select the email domain for this organization so you can complete setup.</p>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Your domain <strong>{setupStatus.domain}</strong> is set. Add the DNS records below at your DNS provider, then click Verify DNS.
                </p>
                {setupStatus?.setupNotes && setupStatus.setupNotes.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {setupStatus.setupNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                )}
                {setupStatus?.lastError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {setupStatus.lastError}
                  </div>
                )}
                {setupStatus?.inboundPipeline &&
                  !setupStatus.inboundPipeline.resendInboundReady &&
                  setupStatus.resend &&
                  (!setupStatus.resend.hasWebhookSecret || !setupStatus.resend.configured) && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                      <p className="font-medium">Email is still being set up</p>
                      <p className="mt-1 text-muted-foreground dark:text-amber-200/90">
                        Save your Resend API key and webhook signing secret below, add the inbound webhook URL in Resend (event{" "}
                        <code className="text-xs">email.received</code>), and publish the MX/DNS records Resend shows for this domain.
                      </p>
                    </div>
                  )}
                {setupStatus?.resend?.inboundWebhookUrl && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inbound webhook URL</p>
                    <p className="text-xs text-muted-foreground">
                      In Resend → Webhooks, create an endpoint with this URL and subscribe to <strong>email.received</strong>.
                    </p>
                    <code className="block text-sm bg-background px-3 py-2 rounded border break-all">{setupStatus.resend.inboundWebhookUrl}</code>
                  </div>
                )}
                {canSetDomain && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resend credentials</p>
                    <p className="text-xs text-muted-foreground">
                      Use an API key from the same Resend project where this domain is added. The signing secret comes from the webhook
                      configuration in Resend (Svix).
                    </p>
                    {maskedResendKey && (
                      <p className="text-xs text-muted-foreground">
                        Saved API key: <span className="font-mono">{maskedResendKey}</span>
                        {setupStatus.resend?.hasWebhookSecret ? " · Webhook secret on file" : ""}
                      </p>
                    )}
                    {!setupStatus.resend?.secretsKeyConfigured && (
                      <p className="text-xs text-amber-800 dark:text-amber-200/90 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        {setupStatus.resend?.secretsKeyIssue === "invalid_format" ? (
                          <>
                            <code className="text-xs">LUMINUM_EMAIL_SECRETS_KEY</code> is set but invalid (need 64 hex chars, e.g.{" "}
                            <code className="text-xs">openssl rand -hex 32</code>). You can still save credentials below; fix the key to
                            enable AES encryption at rest.
                          </>
                        ) : (
                          <>
                            <strong>Optional:</strong> set <code className="text-xs">LUMINUM_EMAIL_SECRETS_KEY</code> (64 hex chars) on the
                            API for encrypted storage. You can save Resend credentials without it — they are stored in a prefixed encoding
                            instead.
                          </>
                        )}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="resend-api-key">Resend API key</Label>
                      <Input
                        id="resend-api-key"
                        type="password"
                        autoComplete="off"
                        placeholder="re_…"
                        value={resendApiKeyInput}
                        onChange={(e) => setResendApiKeyInput(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="resend-webhook-secret">Webhook signing secret</Label>
                      <Input
                        id="resend-webhook-secret"
                        type="password"
                        autoComplete="off"
                        placeholder="From Resend → Webhooks"
                        value={resendWebhookSecretInput}
                        onChange={(e) => setResendWebhookSecretInput(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg"
                      disabled={savingResendCreds}
                      onClick={handleSaveResendCredentials}
                    >
                      {savingResendCreds ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Resend credentials
                    </Button>
                  </div>
                )}
                {!canSetDomain && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Ask an owner or admin to add Resend credentials and complete the webhook in Resend.
                  </p>
                )}
                {setupStatus?.dnsRecords && (
                  <div className="space-y-4 mt-4">
                    <p className="text-sm font-medium text-foreground">Suggested DNS records for {setupStatus.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      Prefer the exact records shown in your Resend dashboard for this domain (especially MX for inbound). The rows below
                      are hints for SPF and DMARC only.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-1">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SPF (TXT)</p>
                        <p className="text-xs text-muted-foreground">Type: TXT · Name: @ (or {setupStatus.dnsRecords.spf.name})</p>
                        {setupStatus.dnsRecords.spf.value ? (
                          <code className="block text-sm bg-background px-3 py-2 rounded border break-all">{setupStatus.dnsRecords.spf.value}</code>
                        ) : null}
                        {setupStatus.dnsRecords.spf.valueNote && (
                          <p className="text-xs text-muted-foreground">{setupStatus.dnsRecords.spf.valueNote}</p>
                        )}
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DMARC (TXT)</p>
                        <p className="text-xs text-muted-foreground">Type: TXT · Name: {setupStatus.dnsRecords.dmarc.name}</p>
                        <code className="block text-sm bg-background px-3 py-2 rounded border break-all">{setupStatus.dnsRecords.dmarc.value}</code>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleVerifyDns}
                  disabled={verifyingDns}
                  className="rounded-xl mt-4"
                >
                  {verifyingDns ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {verifyingDns ? "Checking DNS…" : "Verify DNS"}
                </Button>
                {lastVerifyResult?.checks && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Check results</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {lastVerifyResult.checks.spf && (
                        <div className={cn("flex items-start gap-2 rounded-md px-3 py-2", lastVerifyResult.checks.spf.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive")}>
                          {lastVerifyResult.checks.spf.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                          <span className="text-sm">SPF — {lastVerifyResult.checks.spf.ok ? "OK" : lastVerifyResult.checks.spf.error || "Failed"}</span>
                        </div>
                      )}
                      {lastVerifyResult.checks.dmarc && (
                        <div className={cn("flex items-start gap-2 rounded-md px-3 py-2", lastVerifyResult.checks.dmarc.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive")}>
                          {lastVerifyResult.checks.dmarc.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                          <span className="text-sm">DMARC — {lastVerifyResult.checks.dmarc.ok ? "OK" : lastVerifyResult.checks.dmarc.error || "Failed"}</span>
                        </div>
                      )}
                      {lastVerifyResult.checks.resend && (
                        <div className={cn("flex items-start gap-2 rounded-md px-3 py-2 sm:col-span-2", lastVerifyResult.checks.resend.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-amber-500/10 text-amber-900 dark:text-amber-200")}>
                          {lastVerifyResult.checks.resend.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                          <span className="text-sm">
                            Resend domain — {lastVerifyResult.checks.resend.ok ? "validated" : "not validated — check API key and domain in Resend"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Verify DNS</strong> re-checks your domain against Resend (with your saved API key) and runs advisory SPF/DMARC
                  lookups. When Resend validates and credentials + webhook are in place, the inbox unlocks.
                </p>
              </>
            )}
          </div>
        </div>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer fullWidth>
      <div className="flex flex-col md:flex-row min-h-[min(100dvh,920px)] gap-0">
        <MailboxSidebar
          active={mailbox}
          counts={folderCounts}
          onSelect={(m) => {
            setMailbox(m)
            setPage(1)
            setLoadedForOrgId(null)
            setEmails([])
          }}
        />
        <div className="flex-1 min-w-0 flex flex-col min-h-0 px-3 sm:px-5 lg:px-8 pb-8 pt-3 md:pt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden app-hero bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-4 sm:p-6 md:p-8 lg:p-10 border border-border/40 rounded-2xl shadow-sm"
          >
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <motion.div
                    layout
                    className="p-2 sm:p-2.5 bg-primary/10 rounded-xl shadow-sm shrink-0 ring-1 ring-primary/10"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                  </motion.div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold tracking-tight text-foreground truncate">
                      {mailboxTitle}
                    </h1>
                    <p className="text-muted-foreground mt-0.5 text-sm sm:text-[0.9375rem] leading-snug truncate">
                      {loading
                        ? "Loading…"
                        : displayTotal === 0
                          ? "No messages in this folder"
                          : `${displayTotal.toLocaleString()} message${displayTotal === 1 ? "" : "s"}${
                              mailbox === "inbox" && displayUnread > 0
                                ? ` · ${displayUnread.toLocaleString()} unread`
                                : ""
                            }`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage(1)
                    void fetchEmails(1, true)
                  }}
                  disabled={loading}
                  className="rounded-xl border-border/60 shadow-sm"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>
                {mailbox === "inbox" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleMarkAllAsRead()}
                    disabled={loading || displayUnread === 0}
                    className="rounded-xl border-border/60 shadow-sm"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark all read
                  </Button>
                ) : null}
                <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
                  <SheetTrigger asChild>
                    <Button
                      size="sm"
                      className="shrink-0 rounded-xl shadow-md shadow-primary/15 bg-primary hover:bg-primary/90 transition-transform active:scale-[0.98]"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Compose
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-full sm:max-w-[min(100vw-1rem,480px)] p-0 gap-0 flex flex-col border-l border-border/80 bg-background/95 backdrop-blur-xl data-[state=open]:duration-300"
                  >
                    <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/14 via-primary/5 to-transparent px-6 pt-7 pb-5">
                      <SheetHeader className="space-y-1.5 text-left">
                        <SheetTitle className="text-xl font-semibold tracking-tight">Compose</SheetTitle>
                        <SheetDescription className="text-[13px] leading-relaxed">
                          Mail sends through your verified domain on Resend. Recipients see a professional from-address.
                        </SheetDescription>
                      </SheetHeader>
                    </div>
                    <Tabs defaultValue="send" className="flex-1 flex flex-col min-h-0">
                      <TabsList className="mx-4 mt-4 grid grid-cols-3 h-11 rounded-xl bg-muted/60 p-1">
                        <TabsTrigger value="send" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                          <Send className="h-3.5 w-3.5 opacity-70" />
                          Send
                        </TabsTrigger>
                        <TabsTrigger value="schedule" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                          <Clock className="h-3.5 w-3.5 opacity-70" />
                          Schedule
                        </TabsTrigger>
                        <TabsTrigger value="draft" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                          <FileEdit className="h-3.5 w-3.5 opacity-70" />
                          Draft
                        </TabsTrigger>
                      </TabsList>
                      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From</Label>
                          <div className="flex items-center gap-2 min-w-0 rounded-xl border border-border/80 bg-muted/20 px-3 py-2">
                            <Input
                              placeholder="noreply"
                              value={composeFromLocal}
                              onChange={(e) => setComposeFromLocal(e.target.value)}
                              className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 px-0"
                              autoComplete="off"
                              spellCheck={false}
                            />
                            <span className="text-sm text-muted-foreground shrink-0 truncate max-w-[50%]">
                              @{setupStatus?.domain ?? "…"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="compose-to" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            To
                          </Label>
                          <Input
                            id="compose-to"
                            placeholder="recipient@example.com"
                            value={composeTo}
                            onChange={(e) => setComposeTo(e.target.value)}
                            className="rounded-xl h-11 border-border/80"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="compose-subject" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Subject
                          </Label>
                          <Input
                            id="compose-subject"
                            placeholder="What’s this about?"
                            value={composeSubject}
                            onChange={(e) => setComposeSubject(e.target.value)}
                            className="rounded-xl h-11 border-border/80"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="compose-body" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Message
                          </Label>
                          <Textarea
                            id="compose-body"
                            placeholder="Write your message…"
                            value={composeBody}
                            onChange={(e) => setComposeBody(e.target.value)}
                            className="min-h-[200px] rounded-xl border-border/80 text-[15px] leading-relaxed resize-y"
                          />
                        </div>
                        <TabsContent value="send" className="mt-0 space-y-3 outline-none">
                          <p className="text-xs text-muted-foreground">Delivered immediately via Resend.</p>
                          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
                            <Button
                              variant="ghost"
                              className="rounded-xl"
                              onClick={() => setComposeOpen(false)}
                              disabled={sendingCompose}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="rounded-xl shadow-md shadow-primary/20"
                              onClick={() => void handleSendEmail()}
                              disabled={
                                sendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()
                              }
                            >
                              {sendingCompose ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Sending…
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send now
                                </>
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                        <TabsContent value="schedule" className="mt-0 space-y-3 outline-none">
                          <div className="space-y-1.5">
                            <Label htmlFor="schedule-at" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Send at
                            </Label>
                            <Input
                              id="schedule-at"
                              type="datetime-local"
                              value={scheduleAt}
                              onChange={(e) => setScheduleAt(e.target.value)}
                              className="rounded-xl h-11 border-border/80"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            We’ll queue the message and send it at the chosen time (UTC from your browser).
                          </p>
                          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
                            <Button variant="ghost" className="rounded-xl" onClick={() => setComposeOpen(false)} disabled={sendingCompose}>
                              Cancel
                            </Button>
                            <Button
                              className="rounded-xl"
                              onClick={() => void handleScheduleSend()}
                              disabled={
                                sendingCompose ||
                                !composeTo.trim() ||
                                !composeSubject.trim() ||
                                !composeBody.trim() ||
                                !scheduleAt
                              }
                            >
                              {sendingCompose ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
                              Schedule send
                            </Button>
                          </div>
                        </TabsContent>
                        <TabsContent value="draft" className="mt-0 space-y-3 outline-none">
                          <p className="text-xs text-muted-foreground">Save without sending. Open Drafts to continue editing.</p>
                          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
                            <Button variant="ghost" className="rounded-xl" onClick={() => setComposeOpen(false)} disabled={savingDraft}>
                              Cancel
                            </Button>
                            <Button variant="secondary" className="rounded-xl" onClick={() => void handleSaveDraftCompose()} disabled={savingDraft}>
                              {savingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileEdit className="h-4 w-4 mr-2" />}
                              Save draft
                            </Button>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </motion.div>

      {/* Toolbar */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          <div className="relative flex-1 w-full min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search emails…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-muted-foreground/20 bg-background/50"
              disabled={orgLoading || loading}
            />
          </div>

          <Popover open={emailSelectorOpen} onOpenChange={setEmailSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedEmailAddresses.length > 0 ? "secondary" : "outline"}
                className="h-10 rounded-xl border-dashed shrink-0"
                disabled={orgLoading || loading || availableEmailAddresses.length === 0}
              >
                <Inbox className="h-4 w-4 mr-2" />
                {selectedEmailAddresses.length === 0
                  ? "All addresses"
                  : selectedEmailAddresses.length === 1
                    ? selectedEmailAddresses[0]
                    : `${selectedEmailAddresses.length} addresses`}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 rounded-xl" align="start">
              <Command>
                <CommandInput placeholder="Search addresses…" className="h-10" />
                <CommandList className="max-h-[280px]">
                  <CommandEmpty>No addresses found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => { setSelectedEmailAddresses([]); setEmailSelectorOpen(false) }}
                      className="cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedEmailAddresses.length === 0 ? "opacity-100" : "opacity-0")} />
                      All addresses
                      {selectedEmailAddresses.length === 0 && <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>}
                    </CommandItem>
                    {availableEmailAddresses.length > 0 && <div className="border-t my-1" />}
                    {availableEmailAddresses.map((email) => (
                      <CommandItem
                        key={email}
                        onSelect={() => {
                          setSelectedEmailAddresses((prev) =>
                            prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
                          )
                        }}
                        className="cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedEmailAddresses.includes(email) ? "opacity-100" : "opacity-0")} />
                        <Mail className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate text-sm">{email}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="flex gap-1.5 p-1 rounded-xl bg-muted/50 w-fit">
            {[
              { value: undefined as boolean | undefined, label: "All", icon: InboxIcon },
              { value: false, label: "Unread", icon: Mail },
              { value: true, label: "Read", icon: MailOpen },
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={label}
                variant={filterRead === value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterRead(value)}
                disabled={orgLoading || loading}
                className="rounded-lg h-8 px-3"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {selectedEmailAddresses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedEmailAddresses.map((email) => (
              <Badge key={email} variant="secondary" className="gap-1.5 pr-1 py-1.5 text-xs font-normal rounded-lg">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[180px]">{email}</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmailAddresses((prev) => prev.filter((e) => e !== email))}
                  className="rounded-sm hover:bg-secondary-foreground/20 p-0.5 transition-colors"
                  aria-label={`Remove ${email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSelectedEmailAddresses([])} className="h-7 px-2 text-xs rounded-lg">
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Email list: show cached list instantly when returning from detail */}
      <div className="app-card border bg-card shadow-sm overflow-hidden">
        {!hasCachedList(organization?.id ?? "") && (orgLoading || loading) ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[320px]" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="rounded-full bg-muted/50 p-6 mb-4">
              <Mail className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1 tracking-tight">Nothing here yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {debouncedSearch || selectedEmailAddresses.length > 0 || filterRead !== undefined
                ? "Try changing your filters or search."
                : emptyMailboxHint}
            </p>
          </div>
        ) : (
          <div ref={listContainerRef} className="h-full">
          <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-20rem)]">
            <div className="divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {emails.map((email) => (
                  <motion.div
                    key={email.id}
                    role="button"
                    tabIndex={0}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => handleEmailClick(email)}
                    onMouseEnter={() => handleEmailHover(email.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailClick(email)}
                    className={cn(
                      "flex items-start gap-3 sm:gap-4 px-3 py-3.5 sm:px-4 sm:py-4 md:px-5 transition-colors cursor-pointer group active:bg-muted/50",
                      "hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 min-h-[72px] sm:min-h-0",
                      !email.read && mailbox === "inbox" && "bg-primary/[0.06] hover:bg-primary/10 border-l-[3px] border-l-primary",
                      (email.read || mailbox !== "inbox") && "border-l-[3px] border-l-transparent",
                    )}
                  >
                    <EmailAvatar email={email.from} size={40} className="h-9 w-9 sm:h-10 sm:w-10 ring-1 ring-border/40" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span
                          className={cn(
                            "text-[13px] sm:text-sm truncate tracking-tight",
                            !email.read && mailbox === "inbox" ? "font-semibold text-foreground" : "font-medium text-foreground",
                          )}
                        >
                          {email.from || "Unknown"}
                        </span>
                        <span className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                          {email.scheduled_send_at && !email.sent_at
                            ? smartDate(email.scheduled_send_at)
                            : smartDate(email.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-0.5 min-w-0 flex-wrap">
                        <p
                          className={cn(
                            "text-[13px] sm:text-sm truncate flex-1 min-w-0 leading-snug",
                            !email.read && mailbox === "inbox" ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {email.subject || "(No subject)"}
                        </p>
                        {email.is_draft ? (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-5 border-amber-500/40 text-amber-800 dark:text-amber-200">
                            Draft
                          </Badge>
                        ) : null}
                        {email.scheduled_send_at && !email.sent_at && !email.is_draft ? (
                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 h-5 gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            Scheduled
                          </Badge>
                        ) : null}
                        {email.direction === "outbound" && email.outbound_provider === "resend" && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 h-5">
                            Resend
                          </Badge>
                        )}
                        {email.direction === "outbound" && email.outbound_provider === "ses" && (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-5">
                            SES (legacy)
                          </Badge>
                        )}
                        {email.direction === "outbound" && email.outbound_provider === "mail_app" && !email.fallback_used && (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-5 hidden sm:inline-flex">
                            Mail server (legacy)
                          </Badge>
                        )}
                      </div>
                      {extractPreview(email) && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                          {extractPreview(email)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-lg transition-colors",
                          email.starred
                            ? "text-amber-500 opacity-100"
                            : "text-muted-foreground opacity-70 sm:opacity-0 sm:group-hover:opacity-100",
                        )}
                        onClick={(e) => void toggleStar(e, email)}
                        aria-pressed={email.starred}
                      >
                        <Star className={cn("h-4 w-4", email.starred && "fill-amber-400 text-amber-500")} />
                        <span className="sr-only">{email.starred ? "Unstar" : "Star"}</span>
                      </Button>
                      {email.attachments?.length > 0 && (
                        <span className="text-muted-foreground p-1.5" title={`${email.attachments.length} attachment(s)`}>
                          <Paperclip className="h-4 w-4" />
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteEmail(e, email.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {hasMore && (
              <>
                {loadingMore && (
                  <div className="divide-y border-t">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={`skeleton-${i}`} className="flex items-start gap-4 px-4 py-4 md:px-6 animate-in fade-in-50 duration-200">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <Skeleton className="h-4 w-[180px]" />
                            <Skeleton className="h-3 w-14 shrink-0" />
                          </div>
                          <Skeleton className="h-4 w-[280px] max-w-full" />
                          <Skeleton className="h-3 w-full max-w-[320px]" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
                <div ref={loadMoreSentinelRef} className="min-h-[1px] w-full" aria-hidden />
              </>
            )}
          </ScrollArea>
          </div>
        )}
      </div>
        </div>
      </div>
    </AppPageContainer>
  )
}
