"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Eye, Clock, User, Mail, MessageSquare, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import type { FormSubmission } from "@/lib/types/forms"
import { useOrganization } from "@/lib/contexts/organization-context"
import { detectFormFields, getPrimaryFields } from "@/lib/utils/field-detection"
import { PageDataSpinner } from "@/components/shell/page-data-spinner"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"

interface FormSubmissionsInfoProps {
  websiteId: string
}

export function FormSubmissionsInfo({ websiteId }: FormSubmissionsInfoProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { organization } = useOrganization()
  const router = useRouter()

  const fetchFormSubmissions = useCallback(async () => {
    if (!organization) return

    try {
      setLoading(true)
      setError(null)

      const result = await api.forms.list(websiteId)

      if (result.success && result.submissions) {
        setSubmissions(result.submissions)
      } else {
        setError(result.error || "Failed to fetch form submissions")
      }
    } catch (error) {
      console.error("Failed to fetch form submissions:", error)
      setError("Failed to fetch form submissions")
    } finally {
      setLoading(false)
    }
  }, [websiteId, organization])

  // Realtime: refetch when form created/updated (Ably)
  const onOrgEvent = useCallback((eventType: string) => {
    if (eventType === OrganizationEvents.FORM_SUBMISSION_CREATED || eventType === OrganizationEvents.FORM_SUBMISSION_UPDATED) {
      fetchFormSubmissions()
    }
  }, [fetchFormSubmissions])
  useOrganizationChannel(organization?.id ?? null, onOrgEvent)

  useEffect(() => {
    if (organization) {
      fetchFormSubmissions()
    }
  }, [websiteId, organization, fetchFormSubmissions])

  // Helper function to get display name from form data
  const getDisplayName = (data: Record<string, any>): string => {
    const fields = detectFormFields(data)
    const primaryFields = getPrimaryFields(fields)

    // Look for name field first
    const nameField = primaryFields.find((field) => field.type === "name")
    if (nameField) {
      return String(nameField.value)
    }

    // Fallback to email if no name
    const emailField = primaryFields.find((field) => field.type === "email")
    if (emailField) {
      return String(emailField.value).split("@")[0] // Use part before @
    }

    // Fallback to first available field
    if (primaryFields.length > 0) {
      return String(primaryFields[0].value)
    }

    // Last resort - use first non-empty field
    const allFields = detectFormFields(data)
    if (allFields.length > 0) {
      return String(allFields[0].value)
    }

    return "Form Submission"
  }

  // Helper function to get email from form data
  const getEmail = (data: Record<string, any>): string => {
    const fields = detectFormFields(data)
    const emailField = fields.find((field) => field.type === "email")
    return emailField ? String(emailField.value) : ""
  }

  // Helper function to get message from form data
  const getMessage = (data: Record<string, any>): string => {
    const fields = detectFormFields(data)
    const messageField = fields.find(
      (field) => field.type === "textarea" || field.key.toLowerCase().includes("message"),
    )
    return messageField ? String(messageField.value) : ""
  }

  // Helper function to format time ago
  const getTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
    return `${Math.floor(diffInSeconds / 31536000)}y ago`
  }

  // Sort submissions: newest unseen first, then newest seen, then contacted
  const sortedSubmissions = [...submissions].sort((a, b) => {
    // First priority: unseen submissions
    if (!a.seen && !a.contacted && (b.seen || b.contacted)) return -1
    if (!b.seen && !b.contacted && (a.seen || a.contacted)) return 1

    // Second priority: seen but not contacted
    if (a.seen && !a.contacted && b.contacted) return -1
    if (b.seen && !b.contacted && a.contacted) return 1

    // Within same status, sort by newest first
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  })

  const getStatusBadge = (submission: FormSubmission) => {
    if (submission.contacted) {
      return (
        <Badge
          variant="default"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs font-medium"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Contacted
        </Badge>
      )
    } else if (submission.seen) {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-xs font-medium"
        >
          <Eye className="w-3 h-3 mr-1" />
          Seen
        </Badge>
      )
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 text-xs font-medium animate-pulse"
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          New
        </Badge>
      )
    }
  }

  // Calculate stats
  const total = submissions.length
  const contacted = submissions.filter((s) => s.contacted).length
  const seen = submissions.filter((s) => s.seen && !s.contacted).length
  const pending = submissions.filter((s) => !s.contacted && !s.seen).length

  if (loading) {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/60 bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-balance">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            Form Submissions
          </CardTitle>
          <CardDescription className="text-muted-foreground/80 text-pretty">
            Loading your recent form submission data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PageDataSpinner label="Loading submissions…" className="py-10 sm:py-12" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 border-destructive/20 bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-balance">
            <div className="p-2 rounded-lg bg-destructive/10">
              <FileText className="w-5 h-5 text-destructive" />
            </div>
            Form Submissions
          </CardTitle>
          <CardDescription className="text-destructive/80">Unable to load form submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <p className="font-medium text-foreground">Something went wrong</p>
              <p className="text-sm text-muted-foreground text-pretty">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchFormSubmissions} className="mt-4 bg-transparent">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/60 bg-card">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-balance">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          Form Submissions
        </CardTitle>
        <CardDescription className="text-muted-foreground/80 text-pretty leading-relaxed">
          Recent form submissions from your website visitors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="group/stat p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border transition-all duration-200">
            <div className="text-center space-y-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground group-hover/stat:scale-105 transition-transform">
                {total}
              </div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total</div>
            </div>
          </div>

          <div className="group/stat p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 relative overflow-hidden">
            <div className="text-center space-y-1 relative z-10">
              <div className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 group-hover/stat:scale-105 transition-transform">
                {pending}
              </div>
              <div className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">New</div>
            </div>
            {pending > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-lg"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
          </div>

          <div className="group/stat p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 relative overflow-hidden">
            <div className="text-center space-y-1 relative z-10">
              <div className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300 group-hover/stat:scale-105 transition-transform">
                {seen}
              </div>
              <div className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Seen</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
          </div>

          <div className="group/stat p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 relative overflow-hidden">
            <div className="text-center space-y-1 relative z-10">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300 group-hover/stat:scale-105 transition-transform">
                {contacted}
              </div>
              <div className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">Contacted</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {submissions.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Submissions</h3>
              {submissions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/${organization?.slug}/forms`)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  View All ({submissions.length})
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {sortedSubmissions.slice(0, 5).map((submission) => {
                const name = getDisplayName(submission.data)
                const email = getEmail(submission.data)
                const message = getMessage(submission.data)
                const isUnseen = !submission.seen && !submission.contacted

                return (
                  <div
                    key={submission.id}
                    className={`group/item p-4 sm:p-5 border rounded-xl transition-all duration-200 cursor-pointer relative overflow-hidden ${
                      isUnseen
                        ? "border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/80 to-amber-50/40 dark:from-amber-950/50 dark:to-amber-950/20 hover:from-amber-50 hover:to-amber-50/60 dark:hover:from-amber-950/70 dark:hover:to-amber-950/30 shadow-sm hover:shadow-md"
                        : "border-border/60 bg-gradient-to-r from-card to-card/50 hover:border-border hover:from-muted/30 hover:to-muted/10"
                    }`}
                    onClick={() => router.push(`/${organization?.slug}/forms/${submission.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-semibold text-foreground truncate text-balance">{name}</span>
                          </div>
                          {getStatusBadge(submission)}
                          {isUnseen && (
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-sm"></div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate font-medium">{email}</span>
                            </div>
                          )}
                          {message && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2 text-pretty leading-relaxed">{message}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">{getTimeAgo(submission.submitted_at)}</span>
                        </div>
                      </div>

                      <ArrowRight className="h-5 w-5 text-muted-foreground/60 group-hover/item:text-foreground group-hover/item:translate-x-1 transition-all duration-200 flex-shrink-0" />
                    </div>

                    {/* Subtle hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                  </div>
                )
              })}
            </div>

            {submissions.length > 5 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => router.push(`/${organization?.slug}/forms`)}
                  className="font-medium hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                >
                  View All {submissions.length} Submissions
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 space-y-6">
            <div className="relative mx-auto w-fit">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50">
                <FileText className="h-16 w-16 text-muted-foreground/40" />
              </div>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-foreground text-balance">No submissions yet</h3>
              <p className="text-muted-foreground text-pretty leading-relaxed">
                Form submissions will appear here once visitors start submitting forms on your website. Make sure your
                forms are properly connected!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
