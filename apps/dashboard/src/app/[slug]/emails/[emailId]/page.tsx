import { redirect } from "next/navigation"
import { getEmailById, checkEmailsEnabled, markEmailAsRead } from "@/lib/actions/emails"
import { EmailDetailClient } from "./email-detail-client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"
import { markEmailNotificationsRead } from "@/lib/notifications/actions"
import { requireAuth } from "@/lib/auth/require-auth"

interface EmailDetailPageProps {
  params: Promise<{
    slug: string
    emailId: string
  }>
}

function parseEmailAddresses(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === "string") return [parsed]
      return []
    } catch {
      return value
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean)
    }
  }
  return []
}

export default async function EmailDetailPage({ params }: EmailDetailPageProps) {
  const { slug, emailId } = await params

  // Get email data
  const result = await getEmailById(emailId)

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="rounded-b-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 px-4 py-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${slug}/emails`} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Inbox
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">
              {result.error || "Email not found"}
            </p>
            <p className="text-sm text-muted-foreground">
              The email you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/${slug}/emails`}>Back to Inbox</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const emailData = result.data as any

  // Check if emails are enabled for the organization
  const enabledResult = await checkEmailsEnabled(emailData.organization_id)
  if (!enabledResult.enabled) {
    redirect(`/${slug}/emails`)
  }

  // Get session to mark notifications
  let session: any = null
  try { session = await requireAuth() } catch {}

  // Mark email as read if it's not already read
  if (!emailData.read) {
    await markEmailAsRead(emailId)
  } else if (session?.user?.id) {
    // Even if email is already read, mark related notifications as read when viewing
    await markEmailNotificationsRead(emailId)
  }

  // Transform email data
  const email = {
    id: emailData.id,
    from: emailData.from || "",
    to: parseEmailAddresses(emailData.to),
    cc: parseEmailAddresses(emailData.cc),
    bcc: parseEmailAddresses(emailData.bcc),
    subject: emailData.subject || "(No subject)",
    date: emailData.receivedAt || emailData.createdAt,
    textBody: emailData.text || null,
    htmlBody: emailData.html || null,
    read: true, // Marked as read above
    createdAt: emailData.createdAt,
    attachments: (emailData.attachments || []).map((att: any) => ({
      filename: att.filename,
      size: att.size,
      contentType: att.contentType,
      r2Key: att.r2Key,
      url: att.url,
    })),
    inlineImages: [],
  }

  return <EmailDetailClient email={email} organizationSlug={slug} />
}
