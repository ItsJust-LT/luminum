"use client"

import { useRouter } from "next/navigation"
import { EmailDetailClient } from "./email-detail-client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

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

export default function EmailDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const emailId = params.emailId as string
  const router = useRouter()
  const [state, setState] = useState<{
    status: "loading" | "error" | "redirect" | "ready" | "unavailable"
    error?: string
    email?: any
  }>({ status: "loading" })

  useEffect(() => {
    if (!emailId) return

    let cancelled = false

    async function load() {
      try {
        const result = await api.emails.getById(emailId) as {
          success?: boolean
          data?: any
          error?: string
          emailSystemUnavailable?: boolean
        }
        if (cancelled) return
        if (!result.success || !result.data) {
          if (result.emailSystemUnavailable) {
            setState({
              status: "unavailable",
              error:
                result.error ||
                "Email is not available at this time. Please try again later or contact support if you need assistance.",
            })
            return
          }
          setState({ status: "error", error: result.error || "Email not found" })
          return
        }
        const emailData = result.data

        const enabledResult = await api.emails.checkEnabled(emailData.organization_id) as { enabled?: boolean }
        if (cancelled) return
        if (!enabledResult.enabled) {
          setState({ status: "redirect" })
          router.replace(`/${slug}/emails`)
          return
        }

        if (!emailData.read) {
          await api.emails.markAsRead(emailId)
        } else {
          try {
            await api.notifications.markEmailNotificationsRead(emailId)
          } catch {}
        }

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
          read: true,
          createdAt: emailData.createdAt,
          direction: emailData.direction || "inbound",
          outbound_provider: emailData.outbound_provider ?? null,
          fallback_used: !!emailData.fallback_used,
          provider_message_id: emailData.provider_message_id ?? null,
          starred: !!emailData.starred,
          is_draft: !!emailData.is_draft,
          scheduled_send_at: emailData.scheduled_send_at ?? null,
          sent_at: emailData.sent_at ?? null,
          sender_avatar_url: emailData.sender_avatar_url ?? null,
          messageId: emailData.messageId ?? undefined,
          references: emailData.references ?? undefined,
          in_reply_to: emailData.in_reply_to ?? undefined,
          attachments: (emailData.attachments || []).map((att: any) => ({
            filename: att.filename,
            size: att.size,
            contentType: att.contentType,
            r2Key: att.r2Key,
            url: att.url,
          })),
          inlineImages: [],
        }
        setState({ status: "ready", email })
      } catch {
        if (!cancelled) setState({ status: "error", error: "Failed to load email" })
      }
    }

    load()
    return () => { cancelled = true }
  }, [emailId, slug, router])

  if (state.status === "unavailable") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="rounded-b-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 px-4 py-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${slug}/dashboard`} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">{state.error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (state.status === "loading" || state.status === "redirect") {
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
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (state.status === "error") {
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
              {state.error}
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

  return <EmailDetailClient email={state.email} organizationSlug={slug} />
}
