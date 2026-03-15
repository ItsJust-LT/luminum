"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  FileText
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

interface FormDetailClientProps {
  submission: FormSubmission
  organizationSlug: string
}

export function FormDetailClient({ submission, organizationSlug }: FormDetailClientProps) {
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)
  const [contacted, setContacted] = useState(submission.contacted)

  const handleContactedToggle = async (newContacted: boolean) => {
    setContacted(newContacted)
    try {
      await api.forms.updateStatus(submission.id, { contacted: newContacted })
    } catch {
      setContacted(!newContacted) // Revert on error
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const fields = detectFormFields(submission.data)
  const primaryFields = getPrimaryFields(fields)
  const nameField = primaryFields.find(f => f.type === 'name')
  const emailField = primaryFields.find(f => f.type === 'email')
  const phoneField = primaryFields.find(f => f.type === 'phone')
  const contactMethods = getContactMethods(fields)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              Form Submission Details
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Submitted {formatDate(submission.submitted_at)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {nameField && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium text-foreground">Name</Label>
                        <p className="text-sm text-foreground">{formatFieldValue(nameField)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatFieldValue(nameField), 'name')}
                      className="h-8 w-8 p-0"
                    >
                      {copied === 'name' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
                
                {emailField && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="text-sm font-medium text-foreground">Email</Label>
                        <p className="text-sm text-foreground">{formatFieldValue(emailField)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatFieldValue(emailField), 'email')}
                      className="h-8 w-8 p-0"
                    >
                      {copied === 'email' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}

                {phoneField && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-green-600" />
                      <div>
                        <Label className="text-sm font-medium text-foreground">Phone</Label>
                        <p className="text-sm text-foreground">{formatFieldValue(phoneField)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatFieldValue(phoneField), 'phone')}
                      className="h-8 w-8 p-0"
                    >
                      {copied === 'phone' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Form Submission Data
                </CardTitle>
                <CardDescription>All data submitted through the form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium capitalize flex items-center gap-2">
                        {field.type === 'email' && <Mail className="h-3 w-3 text-primary" />}
                        {field.type === 'phone' && <Phone className="h-3 w-3 text-green-600" />}
                        {field.type === 'name' && <User className="h-3 w-3 text-primary" />}
                        {field.type === 'textarea' && <MessageSquare className="h-3 w-3 text-orange-600" />}
                        {field.type === 'url' && <Globe className="h-3 w-3 text-primary" />}
                        {field.displayName}
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formatFieldValue(field), field.key)}
                        className="h-6 px-2"
                      >
                        {copied === field.key ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-md border">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{formatFieldValue(field)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
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
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={contacted ? "default" : "outline"}
                    className="text-xs"
                  >
                    {contacted ? "Contacted" : "Not contacted"}
                  </Badge>
                </div>

                <Separator />
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Mark as contacted</Label>
                  <Switch checked={contacted} onCheckedChange={handleContactedToggle} />
                </div>
              </CardContent>
            </Card>

            {/* Contact Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Contact Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contactMethods.email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleEmailSubmission(contactMethods.email!)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                )}
                
                {contactMethods.phone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleCallSubmission(contactMethods.phone!)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}
                
                {contactMethods.whatsapp && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleWhatsAppSubmission(contactMethods.whatsapp!, nameField?.value)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

