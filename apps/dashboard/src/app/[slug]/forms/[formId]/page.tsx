"use client"

import { FormDetailClient } from "@/components/forms/form-detail-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (!result.success || !result.submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{result.error || "Submission not found"}</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href={`/${slug}/forms`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Forms
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <FormDetailClient submission={result.submission} organizationSlug={slug} />
}
