"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useMailWorkspace } from "@/lib/contexts/mail-workspace-context"
import { orgNavPath } from "@/lib/org-nav-path"
import { useCustomDomain } from "@/lib/hooks/use-custom-domain"
import { useEmailsContext } from "@/lib/contexts/emails-context"
import type { EmailListItem } from "@/lib/contexts/emails-context"
import { api } from "@/lib/api"
import type { EmailSetupStatus } from "@/lib/types/emails"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  Send,
  Search,
  Trash2,
  Check,
  ChevronsUpDown,
  X,
  Inbox,
  Paperclip,
  RefreshCw,
  Star,
  Clock,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmailAvatar } from "@/components/emails/email-avatar"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { cn } from "@/lib/utils"
import type { MailboxId, FolderCounts } from "@/components/emails/mailbox-sidebar"
import { MailProvisioningView } from "@/components/emails/mail-provisioning-view"

function formatScheduledSendInLocalTime(iso: Date | string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  try {
    return new Intl.DateTimeFormat(undefined, {
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
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

export default function EmailsPage() {
  const { organization } = useOrganization()
  const { isCustomDomain } = useCustomDomain()
  const { mailbox, setMailbox, folderCounts, setFolderCounts, refreshFolderCounts } = useMailWorkspace()
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
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const lastPrefetchedIdRef = useRef<string | null>(null)
  const prevMailWsConnectedRef = useRef(false)
  const lastPolledInboxUnreadRef = useRef<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery, setDebouncedSearch])

  useEffect(() => {
    if (!organization?.id) return
    api.emails.getSetupStatus(organization.id).then((s) => setSetupStatus(s as EmailSetupStatus))
  }, [organization?.id])

  useEffect(() => {
    if (!organization?.id || !setupStatus) return
    if (setupStatus.access !== true || setupStatus.setupComplete) return
    const id = window.setInterval(() => {
      void api.emails.getSetupStatus(organization.id).then((s) => setSetupStatus(s as EmailSetupStatus))
    }, 20000)
    return () => window.clearInterval(id)
  }, [organization?.id, setupStatus?.access, setupStatus?.setupComplete])

  useEffect(() => {
    if (!setupStatus?.setupComplete || !organization?.id) return
    void refreshFolderCounts()
  }, [setupStatus?.setupComplete, organization?.id, refreshFolderCounts])

  const mailboxResetBoot = useRef(true)
  useEffect(() => {
    if (mailboxResetBoot.current) {
      mailboxResetBoot.current = false
      return
    }
    setPage(1)
    setLoadedForOrgId(null)
    setEmails([])
  }, [mailbox, setPage, setLoadedForOrgId, setEmails])

  const router = useRouter()
  const emailsBase =
    organization?.slug != null ? orgNavPath(organization.slug, isCustomDomain, "emails") : "/emails"
  const composeHref = `${emailsBase}/compose`
  const settingsHref = `${emailsBase}/settings`
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
      setFolderCounts,
    ],
  )

  const loadMore = useCallback(() => {
    if (!organization?.id || loadingMore || !hasMore) return
    fetchEmails(page + 1, false)
    setPage((p) => p + 1)
  }, [page, fetchEmails, organization?.id, loadingMore, hasMore, setPage])

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
      const result = (await api.emails.markAllAsRead(organization.id)) as {
        success?: boolean
        updated?: number
        error?: string
      }
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
  }, [organization?.id, setEmails, setUnreadCountFromApi, refreshFolderCounts, setFolderCounts])

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
      inbox: "Messages to your organization addresses show up here.",
      sent: "Outgoing mail appears after you send.",
      starred: "Star a message from any folder to collect it here.",
      drafts: "Save a draft in compose to finish later.",
      scheduled: "Schedule a send from compose to queue it here.",
    }
    return hints[mailbox]
  }, [mailbox])

  const extractPreview = useCallback((email: EmailListItem) => {
    if (email.textBody)
      return email.textBody.slice(0, 120).replace(/\s+/g, " ").trim() + (email.textBody.length > 120 ? "…" : "")
    return ""
  }, [])

  const shouldFetchInbox = setupStatus != null && setupStatus.setupComplete === true
  useEffect(() => {
    if (!organization?.id || !shouldFetchInbox) return
    if (hasCachedList(organization.id) && scrollPosition != null && mailbox === "inbox") return
    setPage(1)
    fetchEmails(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit scrollPosition so clearing it after restore doesn't refetch
  }, [organization?.id, shouldFetchInbox, mailbox, filterRead, debouncedSearch, selectedEmailAddresses, fetchEmails, hasCachedList, scrollPosition, setPage])

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

  const { connected: mailWsConnected } = useOrganizationChannel(
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
            setEmails((prev) => prev.map((email) => (email.id === data.emailId ? { ...email, read: true } : email)))
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
              if (removed && !removed.read) setUnreadCountFromApi((u) => (u != null ? Math.max(0, u - 1) : null))
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

  useEffect(() => {
    if (!organization?.id || !shouldFetchInbox) return
    if (mailWsConnected && !prevMailWsConnectedRef.current) {
      setPage(1)
      void fetchEmails(1, true)
      void refreshFolderCounts()
    }
    prevMailWsConnectedRef.current = mailWsConnected
  }, [mailWsConnected, organization?.id, shouldFetchInbox, fetchEmails, refreshFolderCounts, setPage])

  useEffect(() => {
    if (!organization?.id || !shouldFetchInbox) return
    const tick = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      void (async () => {
        try {
          const r = (await api.emails.folderCounts(organization.id)) as {
            success?: boolean
            data?: FolderCounts
          }
          if (!r?.success || !r.data) return
          setFolderCounts(r.data)
          if (mailbox === "inbox") {
            const prev = lastPolledInboxUnreadRef.current
            lastPolledInboxUnreadRef.current = r.data.inboxUnread
            if (prev != null && r.data.inboxUnread > prev) {
              setPage(1)
              await fetchEmails(1, true)
            }
          }
        } catch {
          /* ignore */
        }
      })()
    }, 12_000)
    return () => window.clearInterval(tick)
  }, [organization?.id, shouldFetchInbox, mailbox, fetchEmails, setPage, setFolderCounts])

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

  const displayTotal = totalCount ?? emails.length
  const displayUnread =
    mailbox === "inbox" ? (unreadCountFromApi ?? folderCounts.inboxUnread) : emails.filter((e) => !e.read).length

  const readFilterValue = filterRead === undefined ? "all" : filterRead ? "read" : "unread"

  if (!organization) return null

  if (setupStatus == null) {
    return (
      <AppPageContainer fullWidth className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-[40vh] flex-1 items-center justify-center px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading mail…</p>
          </div>
        </div>
      </AppPageContainer>
    )
  }

  if (setupStatus.emailSystemUnavailable) {
    return (
      <AppPageContainer fullWidth className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="app-card w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Mail className="text-muted-foreground h-10 w-10" />
              <h2 className="text-foreground text-lg font-semibold">Email unavailable</h2>
              <p className="text-muted-foreground text-sm">
                {setupStatus.error ||
                  "Email is not available right now. Try again later or contact support if it continues."}
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/${organization.slug}/dashboard`)}>
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppPageContainer>
    )
  }

  if (setupStatus.access === false) {
    return (
      <AppPageContainer fullWidth className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="app-card w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Mail className="text-muted-foreground h-10 w-10" />
              <h2 className="text-foreground text-lg font-semibold">Email not enabled</h2>
              <p className="text-muted-foreground text-sm">
                This workspace does not have organization email. Ask an administrator if you need it.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/${organization.slug}/dashboard`)}>
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppPageContainer>
    )
  }

  if (showSetupRequired) {
    return <MailProvisioningView workspaceName={organization?.name} />
  }

  return (
    <AppPageContainer
      fullWidth
      className="mx-auto flex min-h-0 min-w-0 w-full max-w-[1600px] flex-1 flex-col gap-5 overflow-hidden px-0 py-4 sm:py-5 md:py-6"
    >
      <header className="shrink-0 space-y-4 px-1 sm:px-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">{mailboxTitle}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1)
                void fetchEmails(1, true)
              }}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            {mailbox === "inbox" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleMarkAllAsRead()}
                disabled={loading || displayUnread === 0}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={settingsHref}>Settings</Link>
            </Button>
            <Button type="button" size="sm" asChild>
              <Link href={composeHref} className="gap-2">
                <Send className="h-4 w-4" />
                Compose
              </Link>
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search subject, sender, body…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9"
              disabled={orgLoading || loading}
              aria-label="Search mail"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Popover open={emailSelectorOpen} onOpenChange={setEmailSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedEmailAddresses.length > 0 ? "secondary" : "outline"}
                  className="h-10 w-full justify-between sm:w-[min(100%,280px)]"
                  disabled={orgLoading || loading || availableEmailAddresses.length === 0}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Inbox className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {selectedEmailAddresses.length === 0
                        ? "All addresses"
                        : selectedEmailAddresses.length === 1
                          ? selectedEmailAddresses[0]
                          : `${selectedEmailAddresses.length} addresses`}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(calc(100vw-2rem),320px)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Filter addresses…" />
                  <CommandList className="max-h-[280px]">
                    <CommandEmpty>No addresses found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedEmailAddresses([])
                          setEmailSelectorOpen(false)
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn("mr-2 h-4 w-4", selectedEmailAddresses.length === 0 ? "opacity-100" : "opacity-0")}
                        />
                        All addresses
                        {selectedEmailAddresses.length === 0 ? (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Active
                          </Badge>
                        ) : null}
                      </CommandItem>
                      {availableEmailAddresses.length > 0 ? <div className="bg-border my-1 h-px" /> : null}
                      {availableEmailAddresses.map((email) => (
                        <CommandItem
                          key={email}
                          onSelect={() => {
                            setSelectedEmailAddresses((prev) =>
                              prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
                            )
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEmailAddresses.includes(email) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <Mail className="text-muted-foreground mr-2 h-3.5 w-3.5 shrink-0" />
                          <span className="truncate text-sm">{email}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Read state</span>
              <Select
                value={readFilterValue}
                onValueChange={(v) => {
                  if (v === "all") setFilterRead(undefined)
                  else if (v === "read") setFilterRead(true)
                  else setFilterRead(false)
                }}
                disabled={orgLoading || loading}
              >
                <SelectTrigger className="h-10 w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {selectedEmailAddresses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedEmailAddresses.map((email) => (
              <Badge key={email} variant="secondary" className="gap-1.5 rounded-md py-1.5 pr-1 text-xs font-normal">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="max-w-[180px] truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmailAddresses((prev) => prev.filter((e) => e !== email))}
                  className="hover:bg-secondary-foreground/15 rounded-sm p-0.5 transition-colors"
                  aria-label={`Remove ${email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedEmailAddresses([])}>
              Clear all
            </Button>
          </div>
        )}
      </header>

      <div className="app-card flex min-h-[min(280px,50vh)] flex-1 min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm md:min-h-0">
        {!hasCachedList(organization?.id ?? "") && (orgLoading || loading) ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 md:px-5">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[320px] max-w-full" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="bg-muted/50 mb-4 rounded-full p-5">
              <Mail className="text-muted-foreground h-10 w-10" />
            </div>
            <h2 className="text-foreground mb-1 text-lg font-semibold tracking-tight">Nothing here</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              {debouncedSearch || selectedEmailAddresses.length > 0 || filterRead !== undefined
                ? "Adjust search, addresses, or read filter."
                : emptyMailboxHint}
            </p>
          </div>
        ) : (
          <div ref={listContainerRef} className="h-full min-h-0 flex-1">
            <ScrollArea className="h-full min-h-[240px] flex-1 md:min-h-[320px]">
              <div className="divide-y divide-border/60">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEmailClick(email)}
                    onMouseEnter={() => handleEmailHover(email.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailClick(email)}
                    className={cn(
                      "group flex min-h-[72px] cursor-pointer items-start gap-3 px-3 py-3.5 transition-colors active:bg-muted/50 sm:gap-4 sm:px-4 sm:py-4 md:px-5",
                      "hover:bg-muted/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
                      !email.read &&
                        mailbox === "inbox" &&
                        "border-l-[3px] border-l-chart-4 bg-chart-4/[0.06] hover:bg-chart-4/10",
                      (email.read || mailbox !== "inbox") && "border-l-[3px] border-l-transparent"
                    )}
                  >
                    <EmailAvatar
                      email={email.from}
                      senderAvatarUrl={email.sender_avatar_url}
                      size={40}
                      className="ring-border/40 h-9 w-9 shrink-0 ring-1 sm:h-10 sm:w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-[13px] tracking-tight sm:text-sm",
                            !email.read && mailbox === "inbox"
                              ? "text-foreground font-semibold"
                              : "text-foreground font-medium"
                          )}
                        >
                          {email.from || "Unknown"}
                        </span>
                        <span className="text-muted-foreground shrink-0 tabular-nums text-[11px] whitespace-nowrap sm:text-xs">
                          {email.scheduled_send_at && !email.sent_at
                            ? formatScheduledSendInLocalTime(email.scheduled_send_at)
                            : smartDate(email.date)}
                        </span>
                      </div>
                      <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "min-w-0 flex-1 truncate text-[13px] leading-snug sm:text-sm",
                            !email.read && mailbox === "inbox"
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {email.subject || "(No subject)"}
                        </p>
                        {email.is_draft ? (
                          <Badge variant="outline" className="border-chart-3/40 text-chart-3 h-5 shrink-0 px-1.5 py-0 text-[10px]">
                            Draft
                          </Badge>
                        ) : null}
                        {email.scheduled_send_at && !email.sent_at && !email.is_draft ? (
                          <Badge variant="secondary" className="h-5 shrink-0 gap-0.5 px-1.5 py-0 text-[10px]">
                            <Clock className="h-2.5 w-2.5" />
                            Scheduled
                          </Badge>
                        ) : null}
                        {email.direction === "outbound" && email.outbound_provider === "resend" && (
                          <Badge variant="secondary" className="h-5 shrink-0 px-1.5 py-0 text-[10px]">
                            Resend
                          </Badge>
                        )}
                        {email.direction === "outbound" && email.outbound_provider === "ses" && (
                          <Badge variant="outline" className="h-5 shrink-0 px-1.5 py-0 text-[10px]">
                            SES
                          </Badge>
                        )}
                        {email.direction === "outbound" &&
                          email.outbound_provider === "mail_app" &&
                          !email.fallback_used && (
                            <Badge variant="outline" className="hidden h-5 px-1.5 py-0 text-[10px] sm:inline-flex">
                              Legacy
                            </Badge>
                          )}
                      </div>
                      {extractPreview(email) ? (
                        <p className="text-muted-foreground line-clamp-1 text-[11px] leading-relaxed sm:text-xs">
                          {extractPreview(email)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-lg transition-colors",
                          email.starred
                            ? "text-chart-3 opacity-100"
                            : "text-muted-foreground opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                        )}
                        onClick={(e) => void toggleStar(e, email)}
                        aria-pressed={email.starred}
                      >
                        <Star className={cn("h-4 w-4", email.starred && "fill-chart-3 text-chart-3")} />
                        <span className="sr-only">{email.starred ? "Unstar" : "Star"}</span>
                      </Button>
                      {email.attachments?.length > 0 ? (
                        <span className="text-muted-foreground p-1.5" title={`${email.attachments.length} attachment(s)`}>
                          <Paperclip className="h-4 w-4" />
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg opacity-0 transition-opacity sm:group-hover:opacity-100"
                        onClick={(e) => handleDeleteEmail(e, email.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore ? (
                <>
                  {loadingMore ? (
                    <div className="divide-y border-t">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={`skeleton-${i}`} className="flex items-start gap-4 px-4 py-4 md:px-6">
                          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <Skeleton className="h-4 w-[180px]" />
                              <Skeleton className="h-3 w-14 shrink-0" />
                            </div>
                            <Skeleton className="h-4 w-[280px] max-w-full" />
                            <Skeleton className="h-3 w-full max-w-[320px]" />
                          </div>
                          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div ref={loadMoreSentinelRef} className="min-h-[1px] w-full" aria-hidden />
                </>
              ) : null}
            </ScrollArea>
          </div>
        )}
      </div>
    </AppPageContainer>
  )
}
