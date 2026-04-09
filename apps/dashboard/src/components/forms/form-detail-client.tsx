"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Check,
  Phone,
  MessageSquare,
  Calendar,
  User,
  Globe,
  FileText,
} from "lucide-react"
import { api } from "@/lib/api"
import type { FormSubmission } from "@/lib/types/forms"
import {
  detectFormFields,
  getPrimaryFields,
  formatFieldValue,
  getContactMethods,
  getWhatsAppUrl,
  getTelUrl,
} from "@/lib/utils/field-detection"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

interface FormDetailClientProps {
  submission: FormSubmission
  organizationSlug: string
}

export function FormDetailClient({ submission, organizationSlug }: FormDetailClientProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [contacted, setContacted] = useState(submission.contacted)

  const handleContactedToggle = async (newContacted: boolean) => {
    setContacted(newContacted)
    try {
      await api.forms.updateStatus(submission.id, { contacted: newContacted })
    } catch {
      setContacted(!newContacted)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
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
      dateStyle: "full",
      timeStyle: "short",
    })
  }

  const fields = detectFormFields(submission.data)
  const primaryFields = getPrimaryFields(fields)
  const nameField = primaryFields.find((f) => f.type === "name")
  const emailField = primaryFields.find((f) => f.type === "email")
  const phoneField = primaryFields.find((f) => f.type === "phone")
  const contactMethods = getContactMethods(fields)

  const displayName = nameField
    ? formatFieldValue(nameField)
    : emailField
      ? formatFieldValue(emailField)
      : "Submission"

  return (
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" size="sm" className="w-fit gap-2" asChild>
            <Link href={`/${organizationSlug}/forms`}>
              <ArrowLeft className="h-4 w-4" />
              All submissions
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">{displayName}</h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{formatDate(submission.submitted_at)}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
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
              <Badge variant={contacted ? "secondary" : "outline"} className="text-xs">
                {contacted ? "Contacted" : "Open"}
              </Badge>
            </div>
          </div>
        </div>
        <Separator />
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:order-2 xl:col-span-1">
          <Card className="app-card xl:sticky xl:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>Reach out or update follow-up status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contactMethods.email && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => handleEmailSubmission(contactMethods.email!)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send email
                </Button>
              )}
              {contactMethods.phone && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleCallSubmission(contactMethods.phone!)}
                >
                  <Phone className="text-chart-2 mr-2 h-4 w-4" />
                  Call
                </Button>
              )}
              {contactMethods.whatsapp && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleWhatsAppSubmission(contactMethods.whatsapp!, nameField?.value as string | undefined)}
                >
                  <MessageSquare className="text-chart-2 mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
              )}
              {!contactMethods.email && !contactMethods.phone && !contactMethods.whatsapp && (
                <p className="text-muted-foreground text-sm">No email or phone detected in this submission.</p>
              )}
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="contacted-switch" className="text-sm font-medium">
                  Mark as contacted
                </Label>
                <Switch id="contacted-switch" checked={contacted} onCheckedChange={handleContactedToggle} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:order-1 xl:col-span-2">
          {(nameField || emailField || phoneField) && (
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="text-primary h-5 w-5" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nameField && (
                  <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <User className="text-muted-foreground h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs font-medium">Name</p>
                        <p className="text-foreground truncate text-sm">{formatFieldValue(nameField)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(formatFieldValue(nameField), "name")}
                      aria-label="Copy name"
                    >
                      {copied === "name" ? (
                        <Check className="text-chart-2 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}
                {emailField && (
                  <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Mail className="text-primary h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs font-medium">Email</p>
                        <p className="text-foreground truncate text-sm">{formatFieldValue(emailField)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(formatFieldValue(emailField), "email")}
                      aria-label="Copy email"
                    >
                      {copied === "email" ? (
                        <Check className="text-chart-2 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}
                {phoneField && (
                  <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Phone className="text-chart-2 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs font-medium">Phone</p>
                        <p className="text-foreground truncate text-sm">{formatFieldValue(phoneField)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(formatFieldValue(phoneField), "phone")}
                      aria-label="Copy phone"
                    >
                      {copied === "phone" ? (
                        <Check className="text-chart-2 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="app-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="text-primary h-5 w-5" />
                All fields
              </CardTitle>
              <CardDescription>Copy any value or review longer messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-2 text-sm font-medium capitalize">
                      {field.type === "email" && <Mail className="text-primary h-3.5 w-3.5" />}
                      {field.type === "phone" && <Phone className="text-chart-2 h-3.5 w-3.5" />}
                      {field.type === "name" && <User className="text-primary h-3.5 w-3.5" />}
                      {field.type === "textarea" && <MessageSquare className="text-chart-3 h-3.5 w-3.5" />}
                      {field.type === "url" && <Globe className="text-primary h-3.5 w-3.5" />}
                      {field.displayName}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(formatFieldValue(field), field.key)}
                    >
                      {copied === field.key ? (
                        <Check className="text-chart-2 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted/30 rounded-md border p-3">
                    <p className="text-foreground text-sm whitespace-pre-wrap break-words">{formatFieldValue(field)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppPageContainer>
  )
}
