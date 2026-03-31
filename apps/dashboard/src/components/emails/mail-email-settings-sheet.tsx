"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type EmailComposerResponse = {
  emailsEnabled?: boolean
  canEditOrganizationDefaults?: boolean
  organizationDefault?: {
    signatureHtml?: string
    signatureText?: string
    signatureEnabled?: boolean
    defaultFromLocal?: string
  }
  personal?: {
    signatureHtml?: string
    signatureText?: string
  }
}

export function MailEmailSettingsSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  domain?: string
}) {
  const { open, onOpenChange, organizationId, domain } = props
  const [loading, setLoading] = useState(false)
  const [savingOrg, setSavingOrg] = useState(false)
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [canEditOrganizationDefaults, setCanEditOrganizationDefaults] = useState(false)
  const [orgSigHtml, setOrgSigHtml] = useState("")
  const [orgSigText, setOrgSigText] = useState("")
  const [orgSigEnabled, setOrgSigEnabled] = useState(true)
  const [orgFromLocal, setOrgFromLocal] = useState("")
  const [personalSigHtml, setPersonalSigHtml] = useState("")
  const [personalSigText, setPersonalSigText] = useState("")
  const [tab, setTab] = useState<"personal" | "organization">("personal")

  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const res = (await api.organizationSettings.getEmailComposer(organizationId)) as {
        success?: boolean
        data?: EmailComposerResponse
        error?: string
      }
      if (!res?.success || !res.data) throw new Error(res?.error || "Failed to load settings")
      const d = res.data
      setCanEditOrganizationDefaults(d.canEditOrganizationDefaults === true)
      setOrgSigHtml(d.organizationDefault?.signatureHtml || "")
      setOrgSigText(d.organizationDefault?.signatureText || "")
      setOrgSigEnabled(d.organizationDefault?.signatureEnabled !== false)
      setOrgFromLocal(d.organizationDefault?.defaultFromLocal || "")
      setPersonalSigHtml(d.personal?.signatureHtml || "")
      setPersonalSigText(d.personal?.signatureText || "")
      setTab("personal")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load mail settings")
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const saveOrganizationDefaults = async () => {
    if (!organizationId || !canEditOrganizationDefaults) return
    setSavingOrg(true)
    try {
      const res = (await api.organizationSettings.patchEmailComposer(organizationId, {
        organizationDefault: {
          signatureHtml: orgSigHtml,
          signatureText: orgSigText,
          signatureEnabled: orgSigEnabled,
          defaultFromLocal: orgFromLocal.trim() || null,
        },
      })) as { success?: boolean; error?: string }
      if (!res?.success) throw new Error(res?.error || "Save failed")
      toast.success("Organization default mail settings saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSavingOrg(false)
    }
  }

  const savePersonal = async () => {
    if (!organizationId) return
    setSavingPersonal(true)
    try {
      const res = (await api.organizationSettings.patchEmailComposer(organizationId, {
        personal: { signatureHtml: personalSigHtml, signatureText: personalSigText },
      })) as { success?: boolean; error?: string }
      if (!res?.success) throw new Error(res?.error || "Save failed")
      toast.success("Personal signature saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSavingPersonal(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mail &amp; signatures</SheetTitle>
          <SheetDescription>
            Your personal signature is used for mail you send when it is set; otherwise the organization default applies.
            Scheduled messages use your personal signature if you had one when you scheduled them.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "personal" | "organization")} className="mt-6 pb-8">
            <TabsList className="grid w-full grid-cols-2 rounded-lg">
              <TabsTrigger value="personal" className="rounded-md text-xs sm:text-sm">
                Personal signature
              </TabsTrigger>
              <TabsTrigger value="organization" className="rounded-md text-xs sm:text-sm" disabled={!canEditOrganizationDefaults}>
                Organization default
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-5 space-y-5 outline-none">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Overrides the organization default for outbound mail from your account (send, reply, invoice email, and
                scheduled sends you create). Leave blank to use only the organization default.
              </p>
              <div className="space-y-2">
                <Label htmlFor="mail-personal-html">Personal signature (HTML)</Label>
                <Textarea
                  id="mail-personal-html"
                  value={personalSigHtml}
                  onChange={(e) => setPersonalSigHtml(e.target.value)}
                  placeholder="<p>Best regards,</p><p><strong>Your name</strong></p>"
                  className="min-h-[120px] font-mono text-xs"
                  disabled={savingPersonal}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mail-personal-text">Personal signature (plain text)</Label>
                <Textarea
                  id="mail-personal-text"
                  value={personalSigText}
                  onChange={(e) => setPersonalSigText(e.target.value)}
                  placeholder="Best regards,&#10;Your name"
                  className="min-h-[80px] text-sm"
                  disabled={savingPersonal}
                />
                <p className="text-[11px] text-muted-foreground">
                  Plain-text clients; if empty, text is derived from HTML when possible.
                </p>
              </div>
              {personalSigHtml.trim() ? (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Preview</Label>
                  <div
                    className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: personalSigHtml }}
                  />
                </div>
              ) : null}
              <Button className="w-full rounded-xl" onClick={() => void savePersonal()} disabled={savingPersonal}>
                {savingPersonal ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save personal signature"}
              </Button>
            </TabsContent>

            <TabsContent value="organization" className="mt-5 space-y-5 outline-none">
              {!canEditOrganizationDefaults ? (
                <p className="text-sm text-muted-foreground py-4">Only owners and admins can edit organization defaults.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Default From and signature for everyone in this organization who has not set a personal signature.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="mail-def-from">Default From (local part)</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
                      <Input
                        id="mail-def-from"
                        value={orgFromLocal}
                        onChange={(e) => setOrgFromLocal(e.target.value)}
                        placeholder="noreply"
                        className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                        disabled={savingOrg}
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">@{domain ?? "domain"}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Used when compose leaves From empty.</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium">Append organization default signature</p>
                      <p className="text-xs text-muted-foreground">When off, no default signature block is added for anyone.</p>
                    </div>
                    <Switch checked={orgSigEnabled} onCheckedChange={setOrgSigEnabled} disabled={savingOrg} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mail-org-sig-html">Organization signature (HTML)</Label>
                    <Textarea
                      id="mail-org-sig-html"
                      value={orgSigHtml}
                      onChange={(e) => setOrgSigHtml(e.target.value)}
                      placeholder="<p>—</p><p><strong>Acme Inc.</strong></p>"
                      className="min-h-[120px] font-mono text-xs"
                      disabled={savingOrg}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mail-org-sig-text">Organization signature (plain text)</Label>
                    <Textarea
                      id="mail-org-sig-text"
                      value={orgSigText}
                      onChange={(e) => setOrgSigText(e.target.value)}
                      placeholder="—&#10;Acme Inc."
                      className="min-h-[80px] text-sm"
                      disabled={savingOrg}
                    />
                  </div>

                  {orgSigHtml.trim() ? (
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground">Preview</Label>
                      <div
                        className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: orgSigHtml }}
                      />
                    </div>
                  ) : null}

                  <Button className="w-full rounded-xl" onClick={() => void saveOrganizationDefaults()} disabled={savingOrg}>
                    {savingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save organization defaults"}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}
