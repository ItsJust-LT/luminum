import { getFormSubmission } from "@/lib/actions/forms"
import { FormDetailClient } from "@/components/forms/form-detail-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { markFormSubmissionNotificationsRead } from "@/lib/notifications/actions"
import { requireAuth } from "@/lib/auth/require-auth"

interface FormDetailProps {
  params: Promise<{
    slug: string
    formId: string
  }>
}

export default async function FormDetail({ params }: FormDetailProps) {
  const { slug, formId } = await params
  
  const result = await getFormSubmission(formId)

  // Get session to mark notifications
  let session: any = null
  try { session = await requireAuth() } catch {}

  // Mark related notifications as read when viewing form submission
  if (result.success && result.submission && session?.user?.id) {
    await markFormSubmissionNotificationsRead(formId)
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

