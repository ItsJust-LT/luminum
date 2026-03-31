"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type ComposerSettings = {
  signatureHtml: string
  signatureText: string
  signatureEnabled: boolean
  defaultFromLocal: string
  canEdit: boolean
}

export function MailEmailSettingsSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  domain?: string
}) {
  const { open, onOpenChange, organizationId, domain } = props
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ComposerSettings | null>(null)
  const [signatureHtml, setSignatureHtml] = useState("")
  const [signatureText, setSignatureText] = useState("")
  const [signatureEnabled, setSignatureEnabled] = useState(true)
  const [defaultFromLocal, setDefaultFromLocal] = useState("")

  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const res = (await api.organizationSettings.getEmailComposer(organizationId)) as {
        success?: boolean
        data?: ComposerSettings & { emailsEnabled?: boolean }
        error?: string
      }
      if (!res?.success || !res.data) throw new Error(res?.error || "Failed to load settings")
      setData(res.data)
      setSignatureHtml(res.data.signatureHtml || "")
      setSignatureText(res.data.signatureText || "")
      setSignatureEnabled(res.data.signatureEnabled !== false)
      setDefaultFromLocal(res.data.defaultFromLocal || "")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load email settings")
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const handleSave = async () => {
    if (!organizationId || !data?.canEdit) return
    setSaving(true)
    try {
      const res = (await api.organizationSettings.patchEmailComposer(organizationId, {
        signatureHtml,
        signatureText,
        signatureEnabled,
        defaultFromLocal: defaultFromLocal.trim() || null,
      })) as { success?: boolean; error?: string }
      if (!res?.success) throw new Error(res?.error || "Save failed")
      toast.success("Email settings saved")
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Email settings</SheetTitle>
          <SheetDescription>
            Default sender and signatures apply to all outbound mail from this organization, including scheduled sends and invoice emails.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data && !data.canEdit ? (
          <p className="text-sm text-muted-foreground py-6">Only owners and admins can change these settings.</p>
        ) : (
          <div className="mt-6 space-y-5 pb-8">
            <div className="space-y-2">
              <Label htmlFor="mail-def-from">Default From (local part)</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
                <Input
                  id="mail-def-from"
                  value={defaultFromLocal}
                  onChange={(e) => setDefaultFromLocal(e.target.value)}
                  placeholder="noreply"
                  className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  disabled={saving}
                />
                <span className="shrink-0 text-xs text-muted-foreground">@{domain ?? "domain"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Used when the compose field is left empty. You can still override per message.</p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-3">
              <div>
                <p className="text-sm font-medium">Append signature</p>
                <p className="text-xs text-muted-foreground">Adds your signature to every sent email.</p>
              </div>
              <Switch checked={signatureEnabled} onCheckedChange={setSignatureEnabled} disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail-sig-html">Signature (HTML)</Label>
              <Textarea
                id="mail-sig-html"
                value={signatureHtml}
                onChange={(e) => setSignatureHtml(e.target.value)}
                placeholder="<p>—</p><p><strong>Acme Inc.</strong></p>"
                className="min-h-[120px] font-mono text-xs"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail-sig-text">Signature (plain text)</Label>
              <Textarea
                id="mail-sig-text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="—&#10;Acme Inc."
                className="min-h-[80px] text-sm"
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">Shown in plain-text clients; if empty, we derive text from the HTML signature.</p>
            </div>

            {signatureHtml.trim() ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Preview</Label>
                <div
                  className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: signatureHtml }}
                />
              </div>
            ) : null}

            <Button className="w-full rounded-xl" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
