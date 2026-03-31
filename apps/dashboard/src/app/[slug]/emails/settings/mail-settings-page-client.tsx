"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2, Mail } from "lucide-react"
import { api } from "@/lib/api"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useMailWorkspace } from "@/lib/contexts/mail-workspace-context"
import { orgNavPath } from "@/lib/org-nav-path"
import { useCustomDomain } from "@/lib/hooks/use-custom-domain"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const MAX_FORWARD = 5
const MAX_MAILBOX = 20

type MailboxSig = { id: string; localPart: string; signatureHtml?: string | null; signatureText?: string | null }
type ForwardRule = {
  id: string
  enabled: boolean
  forwardTo: string
  matchKind: "all" | "exact" | "wildcard"
  pattern?: string | null
}

function SignaturePreview({ html, label }: { html: string; label: string }) {
  if (!html.trim()) return <p className="text-sm text-muted-foreground">Nothing to preview</p>
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm prose prose-sm dark:prose-invert max-w-none overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

export function MailSettingsPageClient() {
  const { organization, userRole } = useOrganization()
  const { isCustomDomain } = useCustomDomain()
  const { refreshFolderCounts } = useMailWorkspace()
  const canAdmin = userRole === "owner" || userRole === "admin"

  const emailsBase = organization ? orgNavPath(organization.slug, isCustomDomain, "emails") : "/emails"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [mailDomain, setMailDomain] = useState("")

  const [orgSigHtml, setOrgSigHtml] = useState("")
  const [orgSigText, setOrgSigText] = useState("")
  const [orgSigEnabled, setOrgSigEnabled] = useState(true)
  const [orgFromLocal, setOrgFromLocal] = useState("")

  const [personalHtml, setPersonalHtml] = useState("")
  const [personalText, setPersonalText] = useState("")

  const [mailboxSigs, setMailboxSigs] = useState<MailboxSig[]>([])
  const [forwardRules, setForwardRules] = useState<ForwardRule[]>([])

  const load = useCallback(async () => {
    if (!organization?.id) return
    setLoading(true)
    try {
      const res = (await api.organizationSettings.getEmailComposer(organization.id)) as {
        success?: boolean
        data?: {
          mailDomain?: string
          organizationDefault?: {
            signatureHtml?: string
            signatureText?: string
            signatureEnabled?: boolean
            defaultFromLocal?: string
          }
          personal?: { signatureHtml?: string; signatureText?: string }
          mailboxSignatures?: MailboxSig[]
          forwardingRules?: ForwardRule[]
        }
        error?: string
      }
      if (!res?.success || !res.data) throw new Error(res?.error || "Failed to load")
      const d = res.data
      setMailDomain(d.mailDomain || "")
      setOrgSigHtml(d.organizationDefault?.signatureHtml || "")
      setOrgSigText(d.organizationDefault?.signatureText || "")
      setOrgSigEnabled(d.organizationDefault?.signatureEnabled !== false)
      setOrgFromLocal(d.organizationDefault?.defaultFromLocal || "")
      setPersonalHtml(d.personal?.signatureHtml || "")
      setPersonalText(d.personal?.signatureText || "")
      setMailboxSigs(Array.isArray(d.mailboxSignatures) ? d.mailboxSignatures : [])
      setForwardRules(Array.isArray(d.forwardingRules) ? d.forwardingRules : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load mail settings")
    } finally {
      setLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    void load()
  }, [load])

  const savePersonal = async () => {
    if (!organization?.id) return
    setSaving("personal")
    try {
      const res = (await api.organizationSettings.patchEmailComposer(organization.id, {
        personal: { signatureHtml: personalHtml, signatureText: personalText },
      })) as { success?: boolean; error?: string }
      if (!res?.success) throw new Error(res?.error || "Save failed")
      toast.success("Personal signature saved")
      await refreshFolderCounts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(null)
    }
  }

  const saveOrgAndRouting = async () => {
    if (!organization?.id || !canAdmin) return
    setSaving("org")
    try {
      const res = (await api.organizationSettings.patchEmailComposer(organization.id, {
        organizationDefault: {
          signatureHtml: orgSigHtml,
          signatureText: orgSigText,
          signatureEnabled: orgSigEnabled,
          defaultFromLocal: orgFromLocal.trim() || null,
        },
        mailboxSignatures: mailboxSigs.slice(0, MAX_MAILBOX),
        forwardingRules: forwardRules.slice(0, MAX_FORWARD),
      })) as { success?: boolean; error?: string }
      if (!res?.success) throw new Error(res?.error || "Save failed")
      toast.success("Organization mail settings saved")
      await load()
      await refreshFolderCounts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(null)
    }
  }

  const addMailbox = () => {
    if (mailboxSigs.length >= MAX_MAILBOX) return
    setMailboxSigs((prev) => [
      ...prev,
      { id: `m_${Date.now()}`, localPart: "", signatureHtml: "", signatureText: "" },
    ])
  }

  const addForward = () => {
    if (forwardRules.length >= MAX_FORWARD) return
    setForwardRules((prev) => [
      ...prev,
      { id: `f_${Date.now()}`, enabled: true, forwardTo: "", matchKind: "all", pattern: null },
    ])
  }

  if (!organization) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 py-4 sm:px-5 sm:py-6 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2 rounded-lg" asChild>
          <Link href={emailsBase}>
            <ArrowLeft className="h-4 w-4" />
            Back to mail
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate sm:text-2xl">Mail settings</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">Signatures, mailboxes, and inbound forwarding</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Personal signature</CardTitle>
              <CardDescription>
                Applied to mail you send before organization defaults. Overrides per-mailbox signatures and the organization
                default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-html">HTML</Label>
                <Textarea
                  id="p-html"
                  value={personalHtml}
                  onChange={(e) => setPersonalHtml(e.target.value)}
                  className="min-h-[100px] font-mono text-xs"
                  placeholder="<p>Best regards,</p>"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-text">Plain text</Label>
                <Textarea
                  id="p-text"
                  value={personalText}
                  onChange={(e) => setPersonalText(e.target.value)}
                  className="min-h-[72px] text-sm"
                />
              </div>
              <SignaturePreview html={personalHtml} label="Preview" />
              <Button className="rounded-xl" onClick={() => void savePersonal()} disabled={saving !== null}>
                {saving === "personal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save personal signature"}
              </Button>
            </CardContent>
          </Card>

          {canAdmin ? (
            <>
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Organization default</CardTitle>
                  <CardDescription>
                    Broad signature for everyone who does not have a personal signature or a per-mailbox override.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default From (local part)</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                      <Input
                        value={orgFromLocal}
                        onChange={(e) => setOrgFromLocal(e.target.value)}
                        className="h-9 border-0 bg-transparent shadow-none"
                        placeholder="noreply"
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">@{mailDomain || "domain"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium">Append organization signature</p>
                      <p className="text-xs text-muted-foreground">When off, no default signature block is added.</p>
                    </div>
                    <Switch checked={orgSigEnabled} onCheckedChange={setOrgSigEnabled} />
                  </div>
                  <div className="space-y-2">
                    <Label>HTML</Label>
                    <Textarea
                      value={orgSigHtml}
                      onChange={(e) => setOrgSigHtml(e.target.value)}
                      className="min-h-[100px] font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plain text</Label>
                    <Textarea value={orgSigText} onChange={(e) => setOrgSigText(e.target.value)} className="min-h-[72px] text-sm" />
                  </div>
                  <SignaturePreview html={orgSigHtml} label="Organization preview" />
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>Per-mailbox signatures</CardTitle>
                    <CardDescription>
                      Overrides the organization default for a specific address on your domain (local part only, e.g.{" "}
                      <code className="text-xs">sales</code>). Personal signature still wins if set.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1" onClick={addMailbox}>
                    <Plus className="h-4 w-4" />
                    Add ({mailboxSigs.length}/{MAX_MAILBOX})
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {mailboxSigs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No overrides — only the organization default applies.</p>
                  ) : (
                    mailboxSigs.map((row, idx) => (
                      <div key={row.id} className="space-y-3 rounded-xl border border-border/50 p-4">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="space-y-1.5 flex-1 min-w-[140px]">
                            <Label className="text-xs">Local part</Label>
                            <Input
                              value={row.localPart}
                              onChange={(e) => {
                                const v = e.target.value
                                setMailboxSigs((p) => p.map((x, i) => (i === idx ? { ...x, localPart: v } : x)))
                              }}
                              placeholder="sales"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive shrink-0"
                            onClick={() => setMailboxSigs((p) => p.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          placeholder="HTML signature"
                          className="min-h-[80px] font-mono text-xs"
                          value={row.signatureHtml || ""}
                          onChange={(e) => {
                            const v = e.target.value
                            setMailboxSigs((p) => p.map((x, i) => (i === idx ? { ...x, signatureHtml: v } : x)))
                          }}
                        />
                        <Textarea
                          placeholder="Plain text"
                          className="min-h-[56px] text-sm"
                          value={row.signatureText || ""}
                          onChange={(e) => {
                            const v = e.target.value
                            setMailboxSigs((p) => p.map((x, i) => (i === idx ? { ...x, signatureText: v } : x)))
                          }}
                        />
                        <SignaturePreview html={row.signatureHtml || ""} label="Preview" />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>Inbound forwarding</CardTitle>
                    <CardDescription>
                      When a message arrives, matching rules send a copy to external addresses (via your mail provider).
                      Maximum {MAX_FORWARD} rules. Wildcards use <code className="text-xs">*</code> (e.g.{" "}
                      <code className="text-xs">*@vendor.com</code>).
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-1"
                    onClick={addForward}
                    disabled={forwardRules.length >= MAX_FORWARD}
                  >
                    <Plus className="h-4 w-4" />
                    Add rule
                  </Button>
                </CardHeader>
                <CardContent className="space-y-5">
                  {forwardRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No forwarding rules.</p>
                  ) : (
                    forwardRules.map((rule, idx) => (
                      <div key={rule.id} className="space-y-3 rounded-xl border border-border/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(v) =>
                                setForwardRules((p) => p.map((x, i) => (i === idx ? { ...x, enabled: v } : x)))
                              }
                            />
                            <span className="text-sm font-medium">Enabled</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setForwardRules((p) => p.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Forward to</Label>
                          <Input
                            type="email"
                            placeholder="you@gmail.com"
                            value={rule.forwardTo}
                            onChange={(e) =>
                              setForwardRules((p) => p.map((x, i) => (i === idx ? { ...x, forwardTo: e.target.value } : x)))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Match</Label>
                          <Select
                            value={rule.matchKind}
                            onValueChange={(v: "all" | "exact" | "wildcard") =>
                              setForwardRules((p) =>
                                p.map((x, i) => (i === idx ? { ...x, matchKind: v, pattern: v === "all" ? null : x.pattern } : x)),
                              )
                            }
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All inbound to this organization</SelectItem>
                              <SelectItem value="exact">Exact recipient email</SelectItem>
                              <SelectItem value="wildcard">Recipient pattern (wildcard)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {rule.matchKind !== "all" ? (
                          <div className="space-y-1.5">
                            <Label className="text-xs">
                              {rule.matchKind === "exact" ? "Recipient must equal" : "Pattern"}
                            </Label>
                            <Input
                              placeholder={rule.matchKind === "exact" ? `sales@${mailDomain || "example.com"}` : "*@acme.com"}
                              value={rule.pattern || ""}
                              onChange={(e) =>
                                setForwardRules((p) => p.map((x, i) => (i === idx ? { ...x, pattern: e.target.value } : x)))
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full rounded-xl"
                size="lg"
                onClick={() => void saveOrgAndRouting()}
                disabled={saving !== null}
              >
                {saving === "org" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save organization & forwarding"}
              </Button>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-6 text-sm text-muted-foreground">
                Only owners and admins can edit organization defaults, per-mailbox signatures, and forwarding.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
