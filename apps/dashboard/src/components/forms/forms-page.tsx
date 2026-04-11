"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Mail,
  Eye,
  EyeOff,
  MessageSquare,
  AlertTriangle,
  MoreHorizontal,
  ExternalLink,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  Trash2,
} from "lucide-react"
import { api } from "@/lib/api"
import type { FormSubmission, FormSubmissionFilters } from "@/lib/types/forms"
import type { Website } from "@/lib/types/websites"
import { useOrganization } from "@/lib/contexts/organization-context"
import {
  detectFormFields,
  getPrimaryFields,
  formatFieldValue,
  getContactMethods,
  getWhatsAppUrl,
  getTelUrl,
} from "@/lib/utils/field-detection"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { mergeSearchParams } from "@/lib/url-state/list-query"

type ReadFilter = "any" | "new" | "seen"
type ContactFilter = "any" | "not_contacted" | "contacted"

type PendingDelete =
  | { mode: "single"; id: string; summary: string }
  | { mode: "bulk"; ids: string[] }

const FORM_SORT_CHOICES = ["latest", "oldest", "not_contacted", "contacted", "new", "seen"] as const
type FormSortKey = (typeof FORM_SORT_CHOICES)[number]

export function FormsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pushFormsUrl = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const qs = typeof window !== "undefined" ? window.location.search.slice(1) : searchParams.toString()
      const merged = mergeSearchParams(qs, updates)
      router.replace(merged ? `${pathname}?${merged}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )
  const { organization, loading: orgLoading, error: orgError, hasAllPermissions } = useOrganization()
  const canDeleteSubmission = hasAllPermissions(["forms:submissions:manage"])
  const organizationId = organization?.id ?? ""

  const [websites, setWebsites] = useState<Website[] | null>(null)
  const [websitesLoading, setWebsitesLoading] = useState(false)
  const [websitesError, setWebsitesError] = useState<string | null>(null)

  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readFilter, setReadFilter] = useState<ReadFilter>("any")
  const [contactFilter, setContactFilter] = useState<ContactFilter>("any")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<FormSortKey>("not_contacted")
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const primaryWebsite = websites?.[0]
  const searchFieldFocusedRef = useRef(false)

  useEffect(() => {
    if (searchFieldFocusedRef.current) return
    setSearchQuery(searchParams.get("q") ?? "")
  }, [searchParams])

  useEffect(() => {
    const seen = searchParams.get("seen")
    if (seen === "new") setReadFilter("new")
    else if (seen === "seen") setReadFilter("seen")
    else setReadFilter("any")

    const contact = searchParams.get("contact")
    if (contact === "not_contacted") setContactFilter("not_contacted")
    else if (contact === "contacted") setContactFilter("contacted")
    else setContactFilter("any")

    const s = searchParams.get("sort")
    if (s && (FORM_SORT_CHOICES as readonly string[]).includes(s)) setSortBy(s as FormSortKey)
  }, [searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const qs = typeof window !== "undefined" ? window.location.search.slice(1) : searchParams.toString()
      const cur = new URLSearchParams(qs).get("q") ?? ""
      if (searchQuery === cur) return
      const merged = mergeSearchParams(qs, { q: searchQuery || null })
      router.replace(merged ? `${pathname}?${merged}` : pathname, { scroll: false })
    }, 380)
    return () => window.clearTimeout(t)
  }, [searchQuery, pathname, router, searchParams])

  const apiFilters = useMemo((): FormSubmissionFilters => {
    const f: FormSubmissionFilters = {}
    if (readFilter === "new") f.seen = false
    else if (readFilter === "seen") f.seen = true
    if (contactFilter === "not_contacted") f.contacted = false
    else if (contactFilter === "contacted") f.contacted = true
    return f
  }, [readFilter, contactFilter])

  useEffect(() => {
    const run = async () => {
      if (!organizationId) {
        setWebsites(null)
        return
      }
      setWebsitesLoading(true)
      setWebsitesError(null)
      try {
        const res = (await api.websites.list(organizationId)) as { data?: Website[]; error?: string }
        if (res.error) {
          setWebsites(null)
        } else {
          setWebsites(res.data || [])
        }
      } catch (err: unknown) {
        setWebsitesError(err instanceof Error ? err.message : "Failed to fetch websites")
        setWebsites(null)
      } finally {
        setWebsitesLoading(false)
      }
    }
    void run()
  }, [organizationId])

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    if (!organizationId) {
      setError("Organization ID is missing")
      setSubmissions([])
      setLoading(false)
      return
    }
    if (!websites || websites.length === 0) {
      setError(websites && websites.length === 0 ? "No websites found for this organization" : null)
      setSubmissions([])
      setLoading(false)
      return
    }

    const websiteId = websites[0].id
    if (!websiteId) {
      setError("Website ID is missing")
      setSubmissions([])
      setLoading(false)
      return
    }

    try {
      const result = (await api.forms.list(websiteId, apiFilters)) as {
        success?: boolean
        submissions?: FormSubmission[]
        error?: string
      }
      if (result.success) {
        setSubmissions(result.submissions || [])
        setError(null)
      } else {
        setError(result.error || "Failed to fetch form submissions")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch form submissions")
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [organizationId, websites, apiFilters])

  useEffect(() => {
    if (!websitesLoading && websites !== null) {
      void fetchSubmissions()
    }
  }, [apiFilters, websites, websitesLoading, fetchSubmissions])

  useOrganizationChannel(
    organization?.id || null,
    useCallback(
      (eventType: string, data: { submissionId?: string; updates?: Partial<FormSubmission> }) => {
        switch (eventType) {
          case OrganizationEvents.FORM_SUBMISSION_CREATED:
            void fetchSubmissions()
            break
          case OrganizationEvents.FORM_SUBMISSION_UPDATED:
            setSubmissions((prev) =>
              prev.map((sub) =>
                sub.id === data.submissionId ? { ...sub, ...data.updates } : sub
              )
            )
            break
          case OrganizationEvents.FORM_SUBMISSION_DELETED:
            setSubmissions((prev) => prev.filter((sub) => sub.id !== data.submissionId))
            break
        }
      },
      [fetchSubmissions]
    )
  )

  useEffect(() => {
    let filtered = submissions

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((submission) => {
        const fields = detectFormFields(submission.data)
        return fields.some(
          (field) =>
            field.value.toString().toLowerCase().includes(query) ||
            field.displayName.toLowerCase().includes(query)
        )
      })
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        case "oldest":
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
        case "not_contacted":
          if (a.contacted === b.contacted) {
            return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          }
          return a.contacted ? 1 : -1
        case "contacted":
          if (a.contacted === b.contacted) {
            return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          }
          return b.contacted ? 1 : -1
        case "new":
          if (a.seen === b.seen) {
            return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          }
          return a.seen ? 1 : -1
        case "seen":
          if (a.seen === b.seen) {
            return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          }
          return b.seen ? 1 : -1
        default:
          return 0
      }
    })

    setFilteredSubmissions(filtered)
  }, [submissions, searchQuery, sortBy])

  const inboxStats = useMemo(() => {
    const unread = submissions.filter((s) => !s.seen).length
    const needsFollowUp = submissions.filter((s) => !s.contacted).length
    return { total: submissions.length, unread, needsFollowUp }
  }, [submissions])

  const handleContactedToggle = async (submissionId: string, contacted: boolean) => {
    try {
      await api.forms.updateStatus(submissionId, { contacted })
      setSubmissions((prev) => prev.map((sub) => (sub.id === submissionId ? { ...sub, contacted } : sub)))
    } catch {
      /* keep ui */
    }
  }

  const handleSelectSubmission = (submissionId: string) => {
    setSelectedSubmissions((prev) => {
      const next = new Set(prev)
      if (next.has(submissionId)) next.delete(submissionId)
      else next.add(submissionId)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedSubmissions.size === filteredSubmissions.length) {
      setSelectedSubmissions(new Set())
    } else {
      setSelectedSubmissions(new Set(filteredSubmissions.map((s) => s.id)))
    }
  }

  const handleBulkAction = async (action: "contacted" | "uncontacted") => {
    const contacted = action === "contacted"
    await Promise.all(Array.from(selectedSubmissions).map((id) => api.forms.updateStatus(id, { contacted })))
    setSubmissions((prev) =>
      prev.map((sub) => (selectedSubmissions.has(sub.id) ? { ...sub, contacted } : sub))
    )
    setSelectedSubmissions(new Set())
  }

  const handleViewSubmission = (submissionId: string) => {
    if (!organization?.slug) return
    router.push(`/${organization.slug}/forms/${submissionId}`)
  }

  const openDeleteDialog = (submission: FormSubmission) => {
    const fields = detectFormFields(submission.data)
    const primary = getPrimaryFields(fields)
    const nameField = primary.find((f) => f.type === "name")
    const emailField = primary.find((f) => f.type === "email")
    const summary =
      (nameField && formatFieldValue(nameField)) ||
      (emailField && formatFieldValue(emailField)) ||
      "this submission"
    setPendingDelete({ mode: "single", id: submission.id, summary })
  }

  const openBulkDeleteDialog = () => {
    const ids = Array.from(selectedSubmissions)
    if (ids.length === 0) return
    setPendingDelete({ mode: "bulk", ids })
  }

  const confirmDeleteSubmission = async () => {
    if (!pendingDelete) return
    setDeleteSubmitting(true)
    try {
      if (pendingDelete.mode === "single") {
        const res = (await api.forms.delete(pendingDelete.id)) as { success?: boolean; error?: string }
        if (!res?.success) {
          toast.error(res?.error || "Could not delete submission")
          return
        }
        toast.success("Submission deleted")
        setSubmissions((prev) => prev.filter((s) => s.id !== pendingDelete.id))
        setSelectedSubmissions((prev) => {
          const next = new Set(prev)
          next.delete(pendingDelete.id)
          return next
        })
        setPendingDelete(null)
        return
      }

      const ids = pendingDelete.ids
      const deletedIds: string[] = []
      let fail = 0
      for (const id of ids) {
        try {
          const res = (await api.forms.delete(id)) as { success?: boolean; error?: string }
          if (res?.success) deletedIds.push(id)
          else fail++
        } catch {
          fail++
        }
      }

      if (deletedIds.length > 0) {
        setSubmissions((prev) => prev.filter((s) => !deletedIds.includes(s.id)))
        setSelectedSubmissions((prev) => {
          const next = new Set(prev)
          deletedIds.forEach((d) => next.delete(d))
          return next
        })
      }

      if (deletedIds.length === ids.length) {
        toast.success(ids.length === 1 ? "Submission deleted" : `Deleted ${deletedIds.length} submissions`)
        setPendingDelete(null)
      } else if (deletedIds.length > 0) {
        toast.success(`Deleted ${deletedIds.length} of ${ids.length} submissions`)
        if (fail > 0) toast.error(`Could not delete ${fail} submission(s)`)
        setPendingDelete(null)
      } else {
        toast.error("Could not delete submissions")
      }
    } catch {
      toast.error("Could not delete submission")
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleSubmissionHover = (submissionId: string) => {
    if (!organization?.slug) return
    router.prefetch(`/${organization.slug}/forms/${submissionId}`)
  }

  const handleEmailSubmission = (email: string) => {
    window.open(`mailto:${email}`, "_blank")
  }

  const handleCallSubmission = (phone: string) => {
    window.open(getTelUrl(phone), "_self")
  }

  const handleWhatsAppSubmission = (phone: string, name?: string) => {
    const message = name
      ? `Hi ${name}, I'm following up on your form submission.`
      : "Hi, I'm following up on your form submission."
    window.open(getWhatsAppUrl(phone, message), "_blank")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }

  const listBusy = orgLoading || websitesLoading || loading

  if (orgError) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <Card className="app-card border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="text-destructive h-12 w-12" />
            <h2 className="text-foreground text-lg font-semibold">Could not load organization</h2>
            <p className="text-muted-foreground max-w-md text-sm">{orgError}</p>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  if (websitesError) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <Card className="app-card border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="text-destructive h-12 w-12" />
            <h2 className="text-foreground text-lg font-semibold">Could not load websites</h2>
            <p className="text-muted-foreground max-w-md text-sm">{websitesError}</p>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  if (!orgLoading && !organization) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <Card className="app-card">
          <CardContent className="text-muted-foreground py-10 text-center text-sm">Organization not found.</CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-4 sm:space-y-5">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
            <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl">
              <Inbox className="h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">Forms</h1>
              <p className="text-muted-foreground mt-0.5 max-w-2xl text-xs leading-snug sm:text-sm">
                <span className="text-foreground font-medium">{primaryWebsite?.domain || primaryWebsite?.name || "Your site"}</span>
                {filteredSubmissions.length !== submissions.length ? (
                  <span>
                    {" "}
                    · {filteredSubmissions.length}/{submissions.length} match
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {!listBusy && submissions.length > 0 && (
          <div className="border-border/60 bg-card flex flex-wrap overflow-hidden rounded-xl border">
            <div className="border-border/50 flex min-w-[5.5rem] flex-1 flex-col justify-center border-b px-3 py-2.5 sm:border-b-0 sm:border-r sm:px-4">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Total</span>
              <span className="text-foreground text-lg font-semibold tabular-nums sm:text-xl">{inboxStats.total}</span>
            </div>
            <div className="border-border/50 flex min-w-[5.5rem] flex-1 flex-col justify-center border-b px-3 py-2.5 sm:border-b-0 sm:border-r sm:px-4">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Unread</span>
              <span className="text-chart-4 text-lg font-semibold tabular-nums sm:text-xl">{inboxStats.unread}</span>
            </div>
            <div className="flex min-w-[6.5rem] flex-[1.2] flex-col justify-center px-3 py-2.5 sm:px-4">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Follow-up</span>
              <span className="text-chart-3 text-lg font-semibold tabular-nums sm:text-xl">{inboxStats.needsFollowUp}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-xs lg:max-w-sm">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  searchFieldFocusedRef.current = true
                }}
                onBlur={() => {
                  searchFieldFocusedRef.current = false
                }}
                className="h-9 pl-8 text-sm"
                aria-label="Search submissions"
              />
            </div>
            <div className="flex w-full flex-wrap gap-2 min-[420px]:w-auto">
              <div className="flex flex-col gap-1">
                <Label className="sr-only">Read status</Label>
                <Select
                  value={readFilter}
                  onValueChange={(v) => {
                    const vf = v as ReadFilter
                    setReadFilter(vf)
                    pushFormsUrl({
                      seen: vf === "any" ? null : vf === "new" ? "new" : "seen",
                    })
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-[7.5rem] text-sm sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All</SelectItem>
                    <SelectItem value="new">Unread only</SelectItem>
                    <SelectItem value="seen">Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="sr-only">Follow-up status</Label>
                <Select
                  value={contactFilter}
                  onValueChange={(v) => {
                    const cf = v as ContactFilter
                    setContactFilter(cf)
                    pushFormsUrl({
                      contact:
                        cf === "any" ? null : cf === "not_contacted" ? "not_contacted" : "contacted",
                    })
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-[8.5rem] text-sm sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All</SelectItem>
                    <SelectItem value="not_contacted">Not contacted</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-9 min-w-[8.5rem] justify-between gap-2 text-xs sm:text-sm">
                  {sortBy === "not_contacted" && <XCircle className="text-chart-3 h-4 w-4" />}
                  {sortBy === "contacted" && <CheckCircle className="text-chart-2 h-4 w-4" />}
                  {sortBy === "latest" && <ArrowDown className="text-primary h-4 w-4" />}
                  {sortBy === "oldest" && <ArrowUp className="text-primary h-4 w-4" />}
                  {sortBy === "new" && <EyeOff className="text-destructive h-4 w-4" />}
                  {sortBy === "seen" && <Eye className="text-muted-foreground h-4 w-4" />}
                  <span className="capitalize">{sortBy.replace("_", " ")}</span>
                  <ArrowUpDown className="h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("not_contacted")
                    pushFormsUrl({ sort: "not_contacted" })
                  }}
                >
                  <XCircle className="text-chart-3 mr-2 h-4 w-4" />
                  Not contacted first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("contacted")
                    pushFormsUrl({ sort: "contacted" })
                  }}
                >
                  <CheckCircle className="text-chart-2 mr-2 h-4 w-4" />
                  Contacted first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("latest")
                    pushFormsUrl({ sort: "latest" })
                  }}
                >
                  <ArrowDown className="text-primary mr-2 h-4 w-4" />
                  Newest first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("oldest")
                    pushFormsUrl({ sort: "oldest" })
                  }}
                >
                  <ArrowUp className="text-primary mr-2 h-4 w-4" />
                  Oldest first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("new")
                    pushFormsUrl({ sort: "new" })
                  }}
                >
                  <EyeOff className="text-destructive mr-2 h-4 w-4" />
                  Unread first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("seen")
                    pushFormsUrl({ sort: "seen" })
                  }}
                >
                  <Eye className="text-muted-foreground mr-2 h-4 w-4" />
                  Read first
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void fetchSubmissions()}
              disabled={listBusy || !primaryWebsite}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", listBusy && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {selectedSubmissions.size > 0 && (
          <div className="bg-muted/35 border-border/60 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground text-sm">
              {selectedSubmissions.size} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleBulkAction("contacted")}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Mark contacted
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleBulkAction("uncontacted")}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Mark not contacted
              </Button>
              {canDeleteSubmission ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={openBulkDeleteDialog}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete selected
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSubmissions(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}
      </header>

      {listBusy && (
        <div className="space-y-3 py-4">
          <div className="bg-muted h-14 animate-pulse rounded-xl" />
          <div className="bg-muted h-56 animate-pulse rounded-xl sm:h-64" />
        </div>
      )}

      {!listBusy && error && (
        <Card className="app-card border-destructive/40">
          <CardContent className="text-destructive py-4 text-sm">{error}</CardContent>
        </Card>
      )}

      {!listBusy && filteredSubmissions.length === 0 && (
        <Card className="app-card">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <FileText className="text-muted-foreground h-11 w-11" />
            <h2 className="text-foreground font-semibold">
              {searchQuery ? "No matching submissions" : "No submissions yet"}
            </h2>
            <p className="text-muted-foreground max-w-md text-sm">
              {searchQuery
                ? "Try different search words or reset inbox filters."
                : "New entries from your site forms will land here."}
            </p>
            {searchQuery ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!listBusy && filteredSubmissions.length > 0 && (
        <>
          <div className="md:hidden space-y-3">
            {filteredSubmissions.map((submission) => {
              const fields = detectFormFields(submission.data)
              const primaryFields = getPrimaryFields(fields)
              const nameField = primaryFields.find((f) => f.type === "name")
              const emailField = primaryFields.find((f) => f.type === "email")
              const phoneField = primaryFields.find((f) => f.type === "phone")
              const messageField = fields.find((f) => f.type === "textarea" || f.type === "text")
              const contactMethods = getContactMethods(fields)

              return (
                <Card
                  key={submission.id}
                  className="app-card hover:bg-muted/25 cursor-pointer transition-colors"
                  onClick={() => handleViewSubmission(submission.id)}
                  onMouseEnter={() => handleSubmissionHover(submission.id)}
                >
                  <CardContent className="p-3 sm:p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Checkbox
                          checked={selectedSubmissions.has(submission.id)}
                          onCheckedChange={() => handleSelectSubmission(submission.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Select submission"
                        />
                        <div className="min-w-0">
                          <div className="text-foreground font-medium">
                            {nameField
                              ? formatFieldValue(nameField)
                              : emailField
                                ? formatFieldValue(emailField)
                                : "Anonymous"}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs">{formatDate(submission.submitted_at)}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {!submission.seen && <span className="bg-chart-4 h-2 w-2 animate-pulse rounded-full" />}
                        <Badge variant={submission.seen ? "secondary" : "default"} className="text-xs">
                          {submission.seen ? "Read" : "Unread"}
                        </Badge>
                        <Badge variant={submission.contacted ? "secondary" : "outline"} className="text-xs">
                          {submission.contacted ? "Contacted" : "Open"}
                        </Badge>
                      </div>
                    </div>

                    {messageField ? (
                      <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">
                        {formatFieldValue(messageField)}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewSubmission(submission.id)
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="px-3">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {contactMethods.email && (
                            <DropdownMenuItem onClick={() => handleEmailSubmission(contactMethods.email!)}>
                              <Mail className="text-primary mr-2 h-4 w-4" />
                              Email
                            </DropdownMenuItem>
                          )}
                          {contactMethods.phone && (
                            <DropdownMenuItem onClick={() => handleCallSubmission(contactMethods.phone!)}>
                              <Phone className="text-chart-2 mr-2 h-4 w-4" />
                              Call
                            </DropdownMenuItem>
                          )}
                          {contactMethods.whatsapp && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleWhatsAppSubmission(contactMethods.whatsapp!, nameField?.value as string | undefined)
                              }
                            >
                              <MessageSquare className="text-chart-2 mr-2 h-4 w-4" />
                              WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleContactedToggle(submission.id, !submission.contacted)}>
                            {submission.contacted ? (
                              <>
                                <XCircle className="text-chart-3 mr-2 h-4 w-4" />
                                Mark not contacted
                              </>
                            ) : (
                              <>
                                <CheckCircle className="text-chart-2 mr-2 h-4 w-4" />
                                Mark contacted
                              </>
                            )}
                          </DropdownMenuItem>
                          {canDeleteSubmission ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openDeleteDialog(submission)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="app-card hidden md:block">
            <ScrollArea className="max-h-[min(28rem,65vh)] w-full rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground h-9 w-10 py-2 text-xs font-medium">
                      <Checkbox
                        checked={
                          selectedSubmissions.size === filteredSubmissions.length && filteredSubmissions.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-muted-foreground h-9 py-2 text-xs font-medium">Contact</TableHead>
                    <TableHead className="text-muted-foreground h-9 py-2 text-xs font-medium">Status</TableHead>
                    <TableHead className="text-muted-foreground h-9 whitespace-nowrap py-2 text-xs font-medium">Submitted</TableHead>
                    <TableHead className="text-muted-foreground h-9 py-2 text-xs font-medium">Message</TableHead>
                    <TableHead className="text-muted-foreground h-9 w-[88px] py-2 text-right text-xs font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => {
                    const fields = detectFormFields(submission.data)
                    const primaryFields = getPrimaryFields(fields)
                    const nameField = primaryFields.find((f) => f.type === "name")
                    const emailField = primaryFields.find((f) => f.type === "email")
                    const phoneField = primaryFields.find((f) => f.type === "phone")
                    const messageField = fields.find((f) => f.type === "textarea" || f.type === "text")
                    const contactMethods = getContactMethods(fields)

                    return (
                      <TableRow
                        key={submission.id}
                        className="hover:bg-muted/30 cursor-pointer text-sm"
                        onClick={() => handleViewSubmission(submission.id)}
                        onMouseEnter={() => handleSubmissionHover(submission.id)}
                      >
                        <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedSubmissions.has(submission.id)}
                            onCheckedChange={() => handleSelectSubmission(submission.id)}
                            aria-label="Select row"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="space-y-0.5">
                            <div className="font-medium leading-tight">
                              {nameField
                                ? formatFieldValue(nameField)
                                : emailField
                                  ? formatFieldValue(emailField)
                                  : "Anonymous"}
                            </div>
                            {emailField ? (
                              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{formatFieldValue(emailField)}</span>
                              </div>
                            ) : null}
                            {phoneField ? (
                              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3 shrink-0" />
                                {formatFieldValue(phoneField)}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            {!submission.seen && (
                              <span className="bg-chart-4 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" />
                            )}
                            <Badge variant={submission.seen ? "secondary" : "default"} className="text-xs">
                              {submission.seen ? (
                                <>
                                  <Eye className="mr-1 h-3 w-3" /> Read
                                </>
                              ) : (
                                <>
                                  <EyeOff className="mr-1 h-3 w-3" /> Unread
                                </>
                              )}
                            </Badge>
                            <Badge variant={submission.contacted ? "secondary" : "outline"} className="text-xs">
                              {submission.contacted ? "Contacted" : "Open"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap py-2 text-xs">
                          {formatDate(submission.submitted_at)}
                        </TableCell>
                        <TableCell className="py-2">
                          {messageField ? (
                            <div className="text-muted-foreground max-w-[200px] truncate text-xs sm:max-w-[220px] sm:text-sm">
                              {formatFieldValue(messageField)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Open submission"
                              onClick={() => handleViewSubmission(submission.id)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="More">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {contactMethods.email && (
                                  <DropdownMenuItem onClick={() => handleEmailSubmission(contactMethods.email!)}>
                                    <Mail className="text-primary mr-2 h-4 w-4" />
                                    Email
                                  </DropdownMenuItem>
                                )}
                                {contactMethods.phone && (
                                  <DropdownMenuItem onClick={() => handleCallSubmission(contactMethods.phone!)}>
                                    <Phone className="text-chart-2 mr-2 h-4 w-4" />
                                    Call
                                  </DropdownMenuItem>
                                )}
                                {contactMethods.whatsapp && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleWhatsAppSubmission(
                                        contactMethods.whatsapp!,
                                        nameField?.value as string | undefined
                                      )
                                    }
                                  >
                                    <MessageSquare className="text-chart-2 mr-2 h-4 w-4" />
                                    WhatsApp
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleContactedToggle(submission.id, !submission.contacted)}
                                >
                                  {submission.contacted ? (
                                    <>
                                      <XCircle className="text-chart-3 mr-2 h-4 w-4" />
                                      Mark not contacted
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="text-chart-2 mr-2 h-4 w-4" />
                                      Mark contacted
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {canDeleteSubmission ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => openDeleteDialog(submission)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.mode === "bulk"
                ? `Delete ${pendingDelete.ids.length} submissions?`
                : "Delete submission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.mode === "bulk" ? (
                <>
                  This will permanently remove <strong>{pendingDelete.ids.length}</strong> selected{" "}
                  {pendingDelete.ids.length === 1 ? "submission" : "submissions"} from your inbox. This cannot be
                  undone.
                </>
              ) : (
                <>
                  This will permanently remove <strong>{pendingDelete?.summary}</strong> from your inbox. This cannot be
                  undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSubmitting}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteSubmission()
              }}
            >
              {deleteSubmitting
                ? "Deleting…"
                : pendingDelete?.mode === "bulk"
                  ? `Delete ${pendingDelete.ids.length}`
                  : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPageContainer>
  )
}
