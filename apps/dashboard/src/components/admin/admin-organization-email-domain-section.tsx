"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Link2, Loader2, Mail } from "lucide-react"

export type AdminOrgWebsiteRow = { id: string; domain: string; name?: string | null }

export function AdminOrganizationEmailDomainSection(props: {
  organizationId: string
  organizationSlug: string
  websites: AdminOrgWebsiteRow[]
  linkedWebsiteId?: string | null
  onUpdated: () => void
}) {
  const { organizationId, organizationSlug, websites, linkedWebsiteId, onUpdated } = props
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(linkedWebsiteId || websites[0]?.id || "")
  const [saving, setSaving] = useState(false)

  const linkedSite = useMemo(
    () => websites.find((w) => w.id === linkedWebsiteId) ?? null,
    [websites, linkedWebsiteId]
  )

  useEffect(() => {
    if (linkedWebsiteId && websites.some((w) => w.id === linkedWebsiteId)) {
      setSelectedWebsiteId(linkedWebsiteId)
    } else if (websites[0]?.id) {
      setSelectedWebsiteId((prev) => prev || websites[0].id)
    }
  }, [linkedWebsiteId, websites])

  const handleSave = async () => {
    if (!selectedWebsiteId) {
      toast.error("Choose a website domain to use for mail.")
      return
    }
    setSaving(true)
    try {
      const r = (await api.admin.linkOrganizationEmailDomain(organizationId, selectedWebsiteId)) as {
        success?: boolean
        message?: string
        error?: string
      }
      if (!r.success) throw new Error(r.error || "Could not link mail domain")
      toast.success(r.message || "Mail domain updated")
      await onUpdated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not link mail domain")
    } finally {
      setSaving(false)
    }
  }

  const tenantSettingsHref = `/${organizationSlug}/settings`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border-sky-500/20 bg-gradient-to-br from-sky-500/[0.06] via-background to-background shadow-sm">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Mail domain</CardTitle>
                <CardDescription className="max-w-2xl">
                  Inbound and outbound mail use the domain from one of this organization&apos;s websites. Link it here
                  before saving Resend credentials in <strong>Mail delivery</strong> below. Senders set From and Reply-To per
                  message in the workspace compose UI.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {linkedSite ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-card/60 px-3 py-2.5 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Currently linked:</span>
              <span className="font-medium font-mono text-foreground">{linkedSite.domain}</span>
            </div>
          ) : linkedWebsiteId ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              A mail domain is set in the database but does not match any website on this organization. Choose a website
              below and save to fix it.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No website domain linked for mail yet. Saving a Resend API key will fail until you link one.
            </p>
          )}

          {websites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              This organization has no websites. Add a site (e.g. when creating the workspace) so you can pick its domain
              for email. Tenant workspace:{" "}
              <Link href={tenantSettingsHref} className="font-medium text-foreground underline underline-offset-2">
                Settings
              </Link>
              .
            </div>
          ) : (
            <div className="max-w-md space-y-2">
              <Label htmlFor={`mail-domain-website-${organizationId}`}>Website / domain</Label>
              <select
                id={`mail-domain-website-${organizationId}`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.domain}
                    {w.name ? ` (${w.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {websites.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" disabled={saving || !selectedWebsiteId} onClick={() => void handleSave()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Link mail to this domain
              </Button>
              <p className="text-xs text-muted-foreground">
                Also turns on the Email feature for this organization. DNS verification happens after Resend is configured.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}
