"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useEmailsContext } from "@/lib/contexts/emails-context"
import type { EmailListItem } from "@/lib/contexts/emails-context"
import { getEmails, deleteEmail, getEmailAddresses, getEmailSetupStatus, type EmailSetupStatus } from "@/lib/actions/emails"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Mail,
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
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmailAvatar } from "@/components/emails/email-avatar"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { cn } from "@/lib/utils"

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
  const { organization } = useOrganization()
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery, setDebouncedSearch])

  useEffect(() => {
    if (!organization?.id) return
    getEmailSetupStatus(organization.id).then(setSetupStatus)
  }, [organization?.id])

  const router = useRouter()
  const showSetupRequired = setupStatus?.access && !setupStatus?.setupComplete && setupStatus?.domain

  const fetchEmails = useCallback(
    async (pageNum: number, refresh: boolean) => {
      if (!organization?.id) return
      if (refresh) setLoading(true)
      else setLoadingMore(true)
      try {
        const result = await getEmails(
          organization.id,
          pageNum,
          50,
          {
            read: filterRead,
            emailAddresses: selectedEmailAddresses.length > 0 ? selectedEmailAddresses : undefined,
            search: debouncedSearch || undefined,
          }
        )
        if (result.success && result.data) {
          const fetchedEmails = result.data.emails as EmailListItem[]
          const pagination = result.data.pagination
          setHasMore(pagination.hasMore)
          setTotalCount(pagination.total)
          setUnreadCountFromApi(pagination.unreadCount ?? null)
          setOrgLoading(false)
          if (refresh) setEmails(fetchedEmails)
          else setEmails((prev) => [...prev, ...fetchedEmails])
          if (refresh) setLoadedForOrgId(organization.id)
        } else {
          toast.error(result.error || "Failed to fetch emails")
        }
        const emailAddressesResult = await getEmailAddresses(organization.id)
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
    [organization?.id, filterRead, selectedEmailAddresses, debouncedSearch, setEmails, setLoading, setLoadingMore, setHasMore, setTotalCount, setUnreadCountFromApi, setAvailableEmailAddresses, setLoadedForOrgId],
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

  const handleDeleteEmail = useCallback((e: React.MouseEvent, emailId: string) => {
    e.stopPropagation()
    deleteEmail(emailId)
    setEmails((prev) => prev.filter((email) => email.id !== emailId))
  }, [setEmails])

  const extractPreview = useCallback((email: EmailListItem) => {
    if (email.textBody) return email.textBody.slice(0, 120).replace(/\s+/g, " ").trim() + (email.textBody.length > 120 ? "…" : "")
    return ""
  }, [])

  // Fetch when org or filters change; skip when we have cached list (e.g. returning from detail)
  useEffect(() => {
    if (!organization?.id) return
    if (hasCachedList(organization.id) && scrollPosition != null) return
    setPage(1)
    fetchEmails(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit scrollPosition so clearing it after restore doesn't refetch
  }, [organization?.id, filterRead, debouncedSearch, selectedEmailAddresses, fetchEmails, hasCachedList, setPage])

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
        switch (eventType) {
          case OrganizationEvents.EMAIL_CREATED:
            setPage(1)
            fetchEmails(1, true)
            break
          case OrganizationEvents.EMAIL_READ:
            setEmails((prev) =>
              prev.map((email) => (email.id === data.emailId ? { ...email, read: true } : email)),
            )
            setUnreadCountFromApi((prev) => (prev != null ? Math.max(0, prev - 1) : null))
            break
          case OrganizationEvents.EMAIL_DELETED:
            setEmails((prev) => {
              const removed = prev.find((e) => e.id === data.emailId)
              if (removed && !removed.read)
                setUnreadCountFromApi((u) => (u != null ? Math.max(0, u - 1) : null))
              return prev.filter((email) => email.id !== data.emailId)
            })
            setTotalCount((prev) => (prev != null ? Math.max(0, prev - 1) : null))
            break
        }
      },
      [fetchEmails],
    ),
  )

  if (!organization) return null

  const displayTotal = totalCount ?? emails.length
  const displayUnread = unreadCountFromApi ?? emails.filter((e) => !e.read).length

  // Infinite scroll: load more when sentinel enters viewport
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

  if (showSetupRequired) {
    return (
      <AppPageContainer fullWidth>
        <div className="relative overflow-hidden app-hero bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/10 p-4 sm:p-6 md:p-8">
          <div className="relative space-y-4 max-w-2xl">
            <h1 className="text-2xl font-bold text-foreground">Email setup required</h1>
            <p className="text-muted-foreground">
              Your domain’s mail (MX) isn’t pointing to our server yet, so we can’t receive or send email for this organization.
            </p>
            {setupStatus?.lastError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {setupStatus.lastError}
              </div>
            )}
            {setupStatus?.expectedMxHost && (
              <p className="text-sm text-muted-foreground">
                Set your MX record to: <code className="bg-muted px-1.5 py-0.5 rounded">{setupStatus.expectedMxHost}</code>
              </p>
            )}
            {setupStatus?.steps && setupStatus.steps.length > 0 && (
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {setupStatus.steps.map((step, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">{step.title}</span> — {step.description}
                  </li>
                ))}
              </ol>
            )}
            <p className="text-sm text-muted-foreground">
              Need help? Contact your admin — they can complete setup from the admin panel.
            </p>
          </div>
        </div>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer fullWidth>
      {/* Hero header */}
      <div className="relative overflow-hidden app-hero bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 bg-primary/10 rounded-xl shadow-sm shrink-0">
                <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground truncate">
                  Inbox
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm sm:text-base truncate">
                  {loading ? "Loading…" : displayTotal === 0 ? "No emails yet" : `${displayTotal.toLocaleString()} email${displayTotal === 1 ? "" : "s"}${displayUnread > 0 ? ` · ${displayUnread.toLocaleString()} unread` : ""}`}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setPage(1); fetchEmails(1, true) }}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

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
            <h3 className="text-lg font-semibold text-foreground mb-1">No emails found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {debouncedSearch || selectedEmailAddresses.length > 0 || filterRead !== undefined
                ? "Try changing your filters or search."
                : "Emails sent to your organization will appear here."}
            </p>
          </div>
        ) : (
          <div ref={listContainerRef} className="h-full">
          <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-20rem)]">
            <div className="divide-y">
              {emails.map((email) => (
                <div
                  key={email.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEmailClick(email)}
                  onMouseEnter={() => handleEmailHover(email.id)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailClick(email)}
                  className={cn(
                    "flex items-start gap-3 sm:gap-4 px-3 py-3.5 sm:px-4 sm:py-4 md:px-5 transition-colors cursor-pointer group active:bg-muted/50",
                    "hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 min-h-[72px] sm:min-h-0",
                    !email.read && "bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary",
                    email.read && "border-l-4 border-l-transparent",
                  )}
                >
                  <EmailAvatar email={email.from} size={40} className="h-9 w-9 sm:h-10 sm:w-10" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className={cn("text-sm truncate", !email.read ? "font-semibold text-foreground" : "text-foreground")}>
                        {email.from || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {smartDate(email.date)}
                      </span>
                    </div>
                    <p className={cn("text-sm truncate mb-0.5", !email.read ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {email.subject || "(No subject)"}
                    </p>
                    {extractPreview(email) && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{extractPreview(email)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {email.attachments?.length > 0 && (
                      <span className="text-muted-foreground p-1.5" title={`${email.attachments.length} attachment(s)`}>
                        <Paperclip className="h-4 w-4" />
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteEmail(e, email.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
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
    </AppPageContainer>
  )
}
