"use client"

import { useState, type ReactNode } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BarChart3,
  BookOpen,
  Copy,
  Globe,
  Layout,
  Loader2,
  Mail,
  MessageCircle,
  Receipt,
  ShieldCheck,
  CheckCircle,
  Info,
  AlertCircle,
} from "lucide-react"

const BRANDED_DOMAIN_ORIGIN_IP =
  (typeof process.env.NEXT_PUBLIC_SERVER_IP === "string" && process.env.NEXT_PUBLIC_SERVER_IP.trim()) || ""

export type OrgPlatformFeaturesSnapshot = {
  id: string
  slug: string
  name: string
  analytics_enabled: boolean
  emails_enabled: boolean
  whatsapp_enabled: boolean
  blogs_enabled: boolean
  invoices_enabled: boolean
  branded_dashboard_enabled: boolean
  custom_domain: string | null
  custom_domain_prefix: string | null
  custom_domain_verified: boolean
  email_dns_verified_at?: string | Date | null
}

export function AdminOrganizationPlatformFeatures(props: {
  org: OrgPlatformFeaturesSnapshot
  onUpdated: () => void
}) {
  const { org, onUpdated } = props
  const [busy, setBusy] = useState<string | null>(null)
  const [domainDialogOpen, setDomainDialogOpen] = useState(false)
  const [domainPrefix, setDomainPrefix] = useState("admin")
  const [domainBase, setDomainBase] = useState("")
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
      onUpdated()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setBusy(null)
    }
  }

  const toggleFeature = async (
    feature: "analytics" | "email" | "whatsapp" | "blogs" | "invoices",
    enable: boolean
  ) => {
    const key = `${feature}-${enable}`
    await run(key, async () => {
      if (feature === "analytics") {
        await (enable ? api.admin.enableAnalytics(org.id) : api.admin.disableAnalytics(org.id))
      } else if (feature === "email") {
        await (enable ? api.admin.enableEmailAccess(org.id) : api.admin.disableEmail(org.id))
      } else if (feature === "blogs") {
        await (enable ? api.admin.enableBlogs(org.id) : api.admin.disableBlogs(org.id))
      } else if (feature === "invoices") {
        await (enable ? api.admin.enableInvoices(org.id) : api.admin.disableInvoices(org.id))
      } else {
        await (enable ? api.admin.enableWhatsapp(org.id) : api.admin.disableWhatsapp(org.id))
      }
      const labels: Record<string, string> = {
        analytics: "Analytics",
        email: "Email",
        blogs: "Blogs",
        whatsapp: "WhatsApp",
        invoices: "Invoices",
      }
      toast.success(
        feature === "analytics" && enable
          ? "Analytics enabled for this workspace and all its websites"
          : feature === "analytics" && !enable
            ? "Analytics disabled for this workspace and all its websites"
            : `${labels[feature]} ${enable ? "enabled" : "disabled"}`
      )
    })
  }

  const toggleBranded = async (enable: boolean) => {
    await run(`branded-${enable}`, async () => {
      await (enable ? api.admin.enableBrandedDashboard(org.id) : api.admin.disableBrandedDashboard(org.id))
      toast.success(`Branded dashboard ${enable ? "enabled" : "disabled"}`)
    })
  }

  const openDomainDialog = () => {
    setDomainPrefix(org.custom_domain_prefix || "admin")
    setDomainBase(
      org.custom_domain ? org.custom_domain.replace(`${org.custom_domain_prefix || "admin"}.`, "") : ""
    )
    setDomainDialogOpen(true)
  }

  const handleSetCustomDomain = async () => {
    await run("save-domain", async () => {
      const result = (await api.admin.setCustomDomain(org.id, domainPrefix, domainBase)) as {
        success?: boolean
        error?: string
      }
      if (result.success === false) throw new Error(result.error || "Failed to set domain")
      toast.success(
        `Custom domain set: ${domainPrefix}.${domainBase}. Add an A record to the server IP, then verify.`
      )
      setDomainDialogOpen(false)
    })
  }

  const handleRemoveCustomDomain = async () => {
    await run("remove-domain", async () => {
      await api.admin.removeCustomDomain(org.id)
      toast.success("Custom domain removed")
    })
  }

  const handleVerifyDomain = async () => {
    setVerifying(true)
    try {
      const result = (await api.admin.verifyCustomDomain(org.id)) as { verified?: boolean; message?: string }
      if (result.verified) toast.success("Domain verified successfully!")
      else toast.info(result.message || "DNS not yet configured")
      onUpdated()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const featureRow = (
    id: string,
    icon: ReactNode,
    title: string,
    description: string,
    checked: boolean,
    onCheckedChange: (v: boolean) => void,
    disabled?: boolean
  ) => (
    <div className="flex flex-col gap-3 rounded-lg border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3 min-w-0">
        <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor={id} className="text-base font-medium cursor-pointer">
            {title}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled || !!busy}
        className="shrink-0 sm:ml-4"
      />
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature access</CardTitle>
          <CardDescription>
            Turn product areas on or off for this tenant. Email also requires mail credentials under Mail delivery
            below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureRow(
            `feat-analytics-${org.id}`,
            <BarChart3 className="h-5 w-5" />,
            "Analytics",
            "Workspace analytics and reporting.",
            org.analytics_enabled,
            (v) => void toggleFeature("analytics", v)
          )}
          {featureRow(
            `feat-email-${org.id}`,
            <Mail className="h-5 w-5" />,
            "Email",
            "Org mailboxes, compose, and inbound (configure Resend under Mail delivery).",
            org.emails_enabled,
            (v) => void toggleFeature("email", v)
          )}
          {featureRow(
            `feat-whatsapp-${org.id}`,
            <MessageCircle className="h-5 w-5" />,
            "WhatsApp",
            "WhatsApp Business integration for this organization.",
            org.whatsapp_enabled,
            (v) => void toggleFeature("whatsapp", v)
          )}
          {featureRow(
            `feat-blogs-${org.id}`,
            <BookOpen className="h-5 w-5" />,
            "Blogs",
            "Blog posts and public blog routes.",
            org.blogs_enabled,
            (v) => void toggleFeature("blogs", v)
          )}
          {featureRow(
            `feat-invoices-${org.id}`,
            <Receipt className="h-5 w-5" />,
            "Invoices",
            "Invoicing and PDF generation.",
            org.invoices_enabled,
            (v) => void toggleFeature("invoices", v)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Branded dashboard &amp; domain
          </CardTitle>
          <CardDescription>
            Custom hostname for the tenant dashboard. Point DNS to your platform server IP, then verify.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {featureRow(
            `feat-branded-${org.id}`,
            <Globe className="h-5 w-5" />,
            "Branded dashboard",
            "Serve the dashboard on a customer-controlled subdomain once DNS is verified.",
            org.branded_dashboard_enabled,
            (v) => void toggleBranded(v)
          )}

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button type="button" variant="secondary" size="sm" onClick={openDomainDialog} disabled={!!busy}>
              {org.custom_domain ? "Edit custom domain" : "Set custom domain"}
            </Button>
            {org.custom_domain ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleVerifyDomain()}
                  disabled={!!busy || verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Verify domain DNS
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDnsDialogOpen(true)}>
                  <Info className="h-4 w-4 mr-2" />
                  DNS instructions
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void handleRemoveCustomDomain()}
                  disabled={!!busy}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Remove domain
                </Button>
              </>
            ) : null}
          </div>

          {org.custom_domain ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Current hostname</span>
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{org.custom_domain}</code>
              <Badge variant={org.custom_domain_verified ? "default" : "secondary"}>
                {org.custom_domain_verified ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </>
                ) : (
                  "Pending DNS"
                )}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No custom domain configured.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set custom domain</DialogTitle>
            <DialogDescription>
              Configure a branded hostname for <strong>{org.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pf-domain-prefix">Subdomain prefix</Label>
              <Input
                id="pf-domain-prefix"
                value={domainPrefix}
                onChange={(e) => setDomainPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-domain-base">Client domain</Label>
              <Input
                id="pf-domain-base"
                value={domainBase}
                onChange={(e) => setDomainBase(e.target.value.toLowerCase().trim())}
                placeholder="acme.com"
              />
            </div>
            {domainPrefix && domainBase ? (
              <div className="rounded-md bg-muted p-3 space-y-1">
                <p className="text-sm font-medium">Preview</p>
                <p className="text-lg font-mono">
                  {domainPrefix}.{domainBase}
                </p>
              </div>
            ) : null}
            <Button
              onClick={() => void handleSetCustomDomain()}
              disabled={!domainPrefix || !domainBase || busy === "save-domain"}
              className="w-full"
            >
              {busy === "save-domain" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save custom domain"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dnsDialogOpen} onOpenChange={setDnsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>DNS setup</DialogTitle>
            <DialogDescription>
              Point the full hostname at your platform server with an <strong>A</strong> record. Verification uses the
              same IPv4 as <code className="text-xs">SERVER_IP</code> on the API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Badge variant={org.custom_domain_verified ? "default" : "secondary"}>
                {org.custom_domain_verified ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </>
                ) : (
                  "Not verified"
                )}
              </Badge>
              {org.custom_domain ? (
                <span className="text-sm font-mono text-muted-foreground">{org.custom_domain}</span>
              ) : null}
            </div>

            {!BRANDED_DOMAIN_ORIGIN_IP ? (
              <p className="text-xs rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                Set <code className="text-xs">NEXT_PUBLIC_SERVER_IP</code> when building the dashboard so operators see
                the correct IP here.
              </p>
            ) : null}

            {org.custom_domain ? (
              <Card>
                <CardContent className="pt-4 pb-3 space-y-2">
                  <p className="text-sm font-semibold">A record</p>
                  <div className="flex items-center gap-2 bg-muted rounded-md p-2">
                    <code className="text-sm flex-1 font-mono break-all">
                      A {org.custom_domain} → {BRANDED_DOMAIN_ORIGIN_IP || "« set NEXT_PUBLIC_SERVER_IP »"}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!BRANDED_DOMAIN_ORIGIN_IP}
                      onClick={() => BRANDED_DOMAIN_ORIGIN_IP && copyToClipboard(BRANDED_DOMAIN_ORIGIN_IP)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setDnsDialogOpen(false)
                void handleVerifyDomain()
              }}
              disabled={verifying}
            >
              {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Verify now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
