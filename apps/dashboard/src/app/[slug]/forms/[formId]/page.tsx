"use client"

import { FormDetailClient } from "@/components/forms/form-detail-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { FormSubmission } from "@/lib/types/forms"

export default function FormDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const formId = params.formId as string
  const [result, setResult] = useState<{
    success?: boolean
    submission?: FormSubmission
    error?: string
  } | null>(null)

  useEffect(() => {
    if (!formId) return
    api.forms
      .getById(formId)
      .then((res: any) => {
        setResult(res)
        if (res?.success && res?.submission) {
          api.notifications.markFormSubmissionNotificationsRead(formId).catch(() => {})
        }
      })
      .catch(() => setResult({ success: false, error: "Failed to load submission" }))
  }, [formId])

  if (result === null) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading submission…</p>
        </div>
      </AppPageContainer>
    )
  }

  if (!result.success || !result.submission) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <Card className="app-card border-destructive/40">
          <CardContent className="flex flex-col gap-4 py-8 sm:py-10">
            <p className="text-destructive text-sm">{result.error || "Submission not found"}</p>
            <Button variant="outline" size="sm" className="w-fit" asChild>
              <Link href={`/${slug}/forms`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to forms
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  return <FormDetailClient submission={result.submission} organizationSlug={slug} />
}
