"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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
  Calendar, 
  Filter, 
  AlertTriangle,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Download,
  RefreshCw,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SortAsc,
  SortDesc
} from "lucide-react"
import { api } from "@/lib/api"
import type { FormSubmission, FormSubmissionFilters } from "@/lib/types/forms"
import { useOrganization } from "@/lib/contexts/organization-context"
import { 
  detectFormFields, 
  getPrimaryFields, 
  formatFieldValue, 
  getContactMethods,
  getWhatsAppUrl,
  getTelUrl,
  type DetectedField 
} from "@/lib/utils/field-detection"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

export function FormsPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FormSubmissionFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "not_contacted" | "contacted" | "new" | "seen">("not_contacted")

  const { organization, loading: orgLoading, error: orgError } = useOrganization()

  // Get organization ID from context
  if (!organization) {
    return <div>Organization not found</div>
  }
  const organizationId = organization.id

  // Fetch websites for the organization (if organizationId is available)
  const [websites, setWebsites] = useState<any[] | null>(null)
  const [websitesLoading, setWebsitesLoading] = useState(false)
  const [websitesError, setWebsitesError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWebsites = async () => {
      if (!organizationId) {
        setWebsites(null)
        return
      }
      setWebsitesLoading(true)
      setWebsitesError(null)
      try {
        const res = await api.websites.list(organizationId) as { data?: any[]; error?: string }
        if (res.error) {
          setWebsites(null)
        } else {
          setWebsites(res.data || [])
        }
      } catch (err: any) {
        setWebsitesError(err.message || "Failed to fetch websites")
        setWebsites(null)
      }
      setWebsitesLoading(false)
    }
    fetchWebsites()
  }, [organizationId])

  const fetchSubmissions = async () => {
    setLoading(true)
    if (!organizationId) {
      setError("Organization ID is missing")
      setSubmissions([])
      setLoading(false)
      return
    }

    // Check if websites are loaded and available
    if (!websites || websites.length === 0) {
      setError("No websites found for this organization")
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
      const result = await api.forms.list(websiteId, filters) as { success?: boolean; submissions?: FormSubmission[]; error?: string }
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
  }

  // Only fetch submissions when websites are loaded
  useEffect(() => {
    if (!websitesLoading && websites !== null) {
      fetchSubmissions()
    }
  }, [filters, websites, websitesLoading])

  // Listen to real-time form submission events
  useOrganizationChannel(
    organization?.id || null,
    useCallback(
      (eventType: string, data: any) => {
        switch (eventType) {
          case OrganizationEvents.FORM_SUBMISSION_CREATED:
            // Refresh submissions list to show new submission
            fetchSubmissions()
            break
          case OrganizationEvents.FORM_SUBMISSION_UPDATED:
            // Update submission in the list
            setSubmissions((prev) =>
              prev.map((sub) =>
                sub.id === data.submissionId
                  ? { ...sub, ...data.updates }
                  : sub
              )
            )
            break
          case OrganizationEvents.FORM_SUBMISSION_DELETED:
            // Remove deleted submission from the list
            setSubmissions((prev) => prev.filter((sub) => sub.id !== data.submissionId))
            break
        }
      },
      [fetchSubmissions]
    )
  )

  // Filter and sort submissions based on search query, filters, and sort options
  useEffect(() => {
    let filtered = submissions

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(submission => {
        const fields = detectFormFields(submission.data)
        return fields.some(field => 
          field.value.toString().toLowerCase().includes(query) ||
          field.displayName.toLowerCase().includes(query)
        )
      })
    }

    // Apply status filters
    if (filters.seen !== undefined) {
      filtered = filtered.filter(submission => submission.seen === filters.seen)
    }
    if (filters.contacted !== undefined) {
      filtered = filtered.filter(submission => submission.contacted === filters.contacted)
    }

    // Apply sorting
    filtered.sort((a, b) => {
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
  }, [submissions, searchQuery, filters, sortBy])

  const handleContactedToggle = async (submissionId: string, contacted: boolean) => {
    try {
      await api.forms.updateStatus(submissionId, { contacted })
      setSubmissions((prev) => prev.map((sub) => (sub.id === submissionId ? { ...sub, contacted } : sub)))
    } catch {
      // ignore - keep UI state
    }
  }

  const handleSelectSubmission = (submissionId: string) => {
    setSelectedSubmissions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId)
      } else {
        newSet.add(submissionId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedSubmissions.size === filteredSubmissions.length) {
      setSelectedSubmissions(new Set())
    } else {
      setSelectedSubmissions(new Set(filteredSubmissions.map(s => s.id)))
    }
  }

  const handleBulkAction = async (action: 'contacted' | 'uncontacted') => {
    const contacted = action === 'contacted'
    const promises = Array.from(selectedSubmissions).map(id => 
      api.forms.updateStatus(id, { contacted })
    )
    
    await Promise.all(promises)
    setSubmissions(prev => prev.map(sub => 
      selectedSubmissions.has(sub.id) ? { ...sub, contacted } : sub
    ))
    setSelectedSubmissions(new Set())
  }

  const handleViewSubmission = (submissionId: string) => {
    router.push(`/${organization.slug}/forms/${submissionId}`)
  }

  // Prefetch form submission on hover for instant navigation
  const handleSubmissionHover = (submissionId: string) => {
    router.prefetch(`/${organization.slug}/forms/${submissionId}`)
  }

  const handleEmailSubmission = (email: string) => {
    window.open(`mailto:${email}`, '_blank')
  }

  const handleCallSubmission = (phone: string) => {
    window.open(getTelUrl(phone), '_self')
  }

  const handleWhatsAppSubmission = (phone: string, name?: string) => {
    const message = name ? `Hi ${name}, I'm following up on your form submission.` : 'Hi, I\'m following up on your form submission.'
    window.open(getWhatsAppUrl(phone, message), '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }


  // Show loading while organizations or websites are loading
  if (orgLoading || websitesLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-2"></div>
              <div className="h-4 bg-muted rounded w-96"></div>
            </div>
            <div className="flex items-center gap-2 animate-pulse">
              <div className="h-9 bg-muted rounded w-20"></div>
              <div className="h-9 bg-muted rounded w-20"></div>
            </div>
          </div>

          {/* Search and Filters Skeleton */}
          <div className="mb-6">
            <div className="border rounded-lg p-6 animate-pulse">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                  <div className="h-10 bg-muted rounded w-full"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-9 bg-muted rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout Skeleton */}
          <div className="block md:hidden">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 bg-muted rounded"></div>
                      <div>
                        <div className="h-5 bg-muted rounded w-32 mb-1"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 bg-muted rounded w-12"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 bg-muted rounded flex-1"></div>
                    <div className="h-8 bg-muted rounded w-8"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-8 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-5 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Layout Skeleton */}
          <div className="hidden md:block">
            <div className="border rounded-lg overflow-hidden animate-pulse">
              <div className="border-b p-4">
                <div className="grid grid-cols-6 gap-4">
                  <div className="h-4 bg-muted rounded w-4"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-12"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b p-4 last:border-b-0">
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div className="h-4 w-4 bg-muted rounded"></div>
                    <div>
                      <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-32"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 bg-muted rounded w-12"></div>
                      <div className="h-5 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                    <div className="h-3 bg-muted rounded w-40"></div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-muted rounded"></div>
                      <div className="h-8 w-8 bg-muted rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error states
  if (orgError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="border-destructive/20">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Organization</h3>
              <p className="text-muted-foreground mb-4">{orgError}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (websitesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="border-destructive/20">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Websites</h3>
              <p className="text-muted-foreground mb-4">{websitesError}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <AppPageContainer fullWidth>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Form Submissions
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">
              Manage and respond to form submissions from your website
              {filteredSubmissions.length !== submissions.length && (
                <span className="text-primary ml-2 text-sm font-medium">
                  ({filteredSubmissions.length} of {submissions.length} shown)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchSubmissions} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

      {/* Search and Filters */}
      <Card className="app-card mb-4 sm:mb-6">
        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-foreground">Sort by:</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      {sortBy === "not_contacted" && <XCircle className="h-4 w-4 text-orange-500" />}
                      {sortBy === "contacted" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {sortBy === "latest" && <ArrowDown className="text-primary h-4 w-4" />}
                      {sortBy === "oldest" && <ArrowUp className="text-primary h-4 w-4" />}
                      {sortBy === "new" && <EyeOff className="text-destructive h-4 w-4" />}
                      {sortBy === "seen" && <Eye className="h-4 w-4 text-gray-500" />}
                      <span className="capitalize">
                        {sortBy.replace('_', ' ')}
                      </span>
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy("not_contacted")}>
                      <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                      Not Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("contacted")}>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("latest")}>
                      <ArrowDown className="text-primary mr-2 h-4 w-4" />
                      Latest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                      <ArrowUp className="text-primary mr-2 h-4 w-4" />
                      Oldest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("new")}>
                      <EyeOff className="text-destructive mr-2 h-4 w-4" />
                      New (Unseen)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("seen")}>
                      <Eye className="h-4 w-4 mr-2 text-gray-500" />
                      Seen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {selectedSubmissions.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedSubmissions.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('contacted')}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Mark Contacted
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('uncontacted')}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-3 w-3" />
                    Mark Uncontacted
                  </Button>
                </div>
              )}
            </div>

            {showFilters && (
              <div className="flex items-center space-x-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="seen-filter"
                    checked={filters.seen === true}
                    onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, seen: checked ? true : undefined }))}
                  />
                  <Label htmlFor="seen-filter">Seen only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="contacted-filter"
                    checked={filters.contacted === true}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({ ...prev, contacted: checked ? true : undefined }))
                    }
                  />
                  <Label htmlFor="contacted-filter">Contacted only</Label>
                </div>
                <Button variant="ghost" onClick={() => setFilters({})} className="text-sm">
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="app-card mb-4 sm:mb-6 border-destructive">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {filteredSubmissions.length === 0 && !loading && (
          <Card className="app-card text-center py-8 sm:py-12">
            <CardContent className="px-4 sm:px-6">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? "No matching submissions" : "No form submissions yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? "Try adjusting your search terms or filters."
                  : "When visitors submit forms on your website, they'll appear here."
                }
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mobile Layout */}
        <div className="block md:hidden">
          {filteredSubmissions.length > 0 && (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => {
                const fields = detectFormFields(submission.data)
                const primaryFields = getPrimaryFields(fields)
                const nameField = primaryFields.find(f => f.type === 'name')
                const emailField = primaryFields.find(f => f.type === 'email')
                const phoneField = primaryFields.find(f => f.type === 'phone')
                const messageField = fields.find(f => f.type === 'textarea' || f.type === 'text')
                const contactMethods = getContactMethods(fields)

                return (
                  <Card 
                    key={submission.id} 
                    className="app-card overflow-hidden cursor-pointer active:bg-muted/50 transition-colors"
                    onClick={() => handleViewSubmission(submission.id)}
                    onMouseEnter={() => handleSubmissionHover(submission.id)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedSubmissions.has(submission.id)}
                            onCheckedChange={() => handleSelectSubmission(submission.id)}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                          <div>
                            <div className="font-medium text-lg">
                              {nameField ? formatFieldValue(nameField) : emailField ? formatFieldValue(emailField) : "Anonymous"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(submission.submitted_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!submission.seen && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                          <Badge 
                            variant={submission.seen ? "secondary" : "default"} 
                            className="text-xs"
                          >
                            {submission.seen ? "Seen" : "New"}
                          </Badge>
                        </div>
                      </div>
                      
                      {messageField && (
                        <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {formatFieldValue(messageField)}
                        </div>
                      )}

                      {/* Contact Actions - Mobile */}
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSubmission(submission.id)}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {contactMethods.email && (
                              <DropdownMenuItem onClick={() => handleEmailSubmission(contactMethods.email!)}>
                                <Mail className="text-primary mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                            )}
                            {contactMethods.phone && (
                              <DropdownMenuItem onClick={() => handleCallSubmission(contactMethods.phone!)}>
                                <Phone className="h-4 w-4 mr-2 text-green-500" />
                                Call
                              </DropdownMenuItem>
                            )}
                            {contactMethods.whatsapp && (
                              <DropdownMenuItem onClick={() => handleWhatsAppSubmission(contactMethods.whatsapp!, nameField?.value)}>
                                <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                                WhatsApp
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleContactedToggle(submission.id, !submission.contacted)}
                            >
                              {submission.contacted ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                                  Mark Uncontacted
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                  Mark Contacted
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status Toggle - Mobile */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={submission.contacted}
                            onCheckedChange={(checked) => handleContactedToggle(submission.id, checked)}
                          />
                          <Label className="text-sm">
                            {submission.contacted ? "Contacted" : "Not contacted"}
                          </Label>
                        </div>
                        <Badge 
                          variant={submission.contacted ? "default" : "outline"}
                          className="text-xs"
                        >
                          {submission.contacted ? "Contacted" : "Not contacted"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          {filteredSubmissions.length > 0 && (
            <Card className="app-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSubmissions.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => {
                      const fields = detectFormFields(submission.data)
                      const primaryFields = getPrimaryFields(fields)
                      const nameField = primaryFields.find(f => f.type === 'name')
                      const emailField = primaryFields.find(f => f.type === 'email')
                      const phoneField = primaryFields.find(f => f.type === 'phone')
                      const messageField = fields.find(f => f.type === 'textarea' || f.type === 'text')
                      const contactMethods = getContactMethods(fields)

                      return (
                        <TableRow 
                          key={submission.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewSubmission(submission.id)}
                          onMouseEnter={() => handleSubmissionHover(submission.id)}
                        >
                          <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedSubmissions.has(submission.id)}
                              onCheckedChange={() => handleSelectSubmission(submission.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {nameField ? formatFieldValue(nameField) : emailField ? formatFieldValue(emailField) : "Anonymous"}
                              </div>
                              {emailField && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {formatFieldValue(emailField)}
                                </div>
                              )}
                              {phoneField && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {formatFieldValue(phoneField)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!submission.seen && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                              <Badge 
                                variant={submission.seen ? "secondary" : "default"} 
                                className="text-xs"
                              >
                                {submission.seen ? (
                                  <>
                                    <Eye className="h-3 w-3 mr-1" /> Seen
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-3 w-3 mr-1" /> New
                                  </>
                                )}
                              </Badge>
                              <Badge 
                                variant={submission.contacted ? "default" : "outline"} 
                                className="text-xs"
                              >
                                {submission.contacted ? "Contacted" : "Not contacted"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(submission.submitted_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {messageField && (
                              <div className="text-sm text-muted-foreground max-w-xs truncate">
                                {formatFieldValue(messageField)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSubmission(submission.id)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {contactMethods.email && (
                                    <DropdownMenuItem onClick={() => handleEmailSubmission(contactMethods.email!)}>
                                      <Mail className="text-primary mr-2 h-4 w-4" />
                                      Send Email
                                    </DropdownMenuItem>
                                  )}
                                  {contactMethods.phone && (
                                    <DropdownMenuItem onClick={() => handleCallSubmission(contactMethods.phone!)}>
                                      <Phone className="h-4 w-4 mr-2 text-green-500" />
                                      Call
                                    </DropdownMenuItem>
                                  )}
                                  {contactMethods.whatsapp && (
                                    <DropdownMenuItem onClick={() => handleWhatsAppSubmission(contactMethods.whatsapp!, nameField?.value)}>
                                      <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                                      WhatsApp
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => handleContactedToggle(submission.id, !submission.contacted)}
                                  >
                                    {submission.contacted ? (
                                      <>
                                        <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                                        Mark Uncontacted
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        Mark Contacted
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
              </div>
            </Card>
          )}
        </div>
    </AppPageContainer>
  )
}