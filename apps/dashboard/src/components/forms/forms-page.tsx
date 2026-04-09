"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
import { cn } from "@/lib/utils"

type ReadFilter = "any" | "new" | "seen"
type ContactFilter = "any" | "not_contacted" | "contacted"

export function FormsPage() {
  const router = useRouter()
  const { organization, loading: orgLoading, error: orgError } = useOrganization()
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
  const [sortBy, setSortBy] = useState<
    "latest" | "oldest" | "not_contacted" | "contacted" | "new" | "seen"
  >("not_contacted")

  const primaryWebsite = websites?.[0]

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
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Inbox className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Forms</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed sm:text-base">
                  Submissions from{" "}
                  <span className="text-foreground font-medium">
                    {primaryWebsite?.domain || primaryWebsite?.name || "your site"}
                  </span>
                  {filteredSubmissions.length !== submissions.length ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · showing {filteredSubmissions.length} of {submissions.length} after search
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {!listBusy && submissions.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="app-card">
              <CardHeader className="pb-2">
                <CardDescription>Inbox</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{inboxStats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="app-card">
              <CardHeader className="pb-2">
                <CardDescription>Unread</CardDescription>
                <CardTitle className="text-chart-4 text-2xl tabular-nums">{inboxStats.unread}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="app-card">
              <CardHeader className="pb-2">
                <CardDescription>Needs follow-up</CardDescription>
                <CardTitle className="text-chart-3 text-2xl tabular-nums">{inboxStats.needsFollowUp}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search name, email, phone, message…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search submissions"
              />
            </div>
            <div className="grid w-full grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:w-auto lg:flex lg:items-center">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Read</Label>
                <Select
                  value={readFilter}
                  onValueChange={(v) => setReadFilter(v as ReadFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[158px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All</SelectItem>
                    <SelectItem value="new">Unread only</SelectItem>
                    <SelectItem value="seen">Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Follow-up</Label>
                <Select
                  value={contactFilter}
                  onValueChange={(v) => setContactFilter(v as ContactFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[168px]">
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

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="min-w-[9rem] justify-between gap-2">
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
                <DropdownMenuItem onClick={() => setSortBy("not_contacted")}>
                  <XCircle className="text-chart-3 mr-2 h-4 w-4" />
                  Not contacted first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("contacted")}>
                  <CheckCircle className="text-chart-2 mr-2 h-4 w-4" />
                  Contacted first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("latest")}>
                  <ArrowDown className="text-primary mr-2 h-4 w-4" />
                  Newest first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                  <ArrowUp className="text-primary mr-2 h-4 w-4" />
                  Oldest first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("new")}>
                  <EyeOff className="text-destructive mr-2 h-4 w-4" />
                  Unread first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("seen")}>
                  <Eye className="text-muted-foreground mr-2 h-4 w-4" />
                  Read first
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchSubmissions()}
              disabled={listBusy || !primaryWebsite}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", listBusy && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {selectedSubmissions.size > 0 && (
          <div className="bg-muted/40 border-border flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSubmissions(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}
      </header>

      {listBusy && (
        <div className="space-y-4 py-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-24 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="bg-muted h-64 animate-pulse rounded-xl" />
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
                  <CardContent className="p-4">
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="app-card hidden md:block">
            <ScrollArea className="max-h-[min(32rem,70vh)] w-full rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          selectedSubmissions.size === filteredSubmissions.length && filteredSubmissions.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="whitespace-nowrap">Submitted</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleViewSubmission(submission.id)}
                        onMouseEnter={() => handleSubmissionHover(submission.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedSubmissions.has(submission.id)}
                            onCheckedChange={() => handleSelectSubmission(submission.id)}
                            aria-label="Select row"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
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
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
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
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatDate(submission.submitted_at)}
                        </TableCell>
                        <TableCell>
                          {messageField ? (
                            <div className="text-muted-foreground max-w-[220px] truncate text-sm">
                              {formatFieldValue(messageField)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
    </AppPageContainer>
  )
}
