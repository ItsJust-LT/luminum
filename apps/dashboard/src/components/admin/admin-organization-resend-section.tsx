"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Mail,
  KeyRound,
  Webhook,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Shield,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ResendAdminStatus = {
  success?: boolean
  secretsKeyConfigured?: boolean
  secretsKeyIssue?: "invalid_format" | "missing" | string
  hasApiKey?: boolean
  hasWebhookSecret?: boolean
  maskedApiKey?: string | null
  emailDomain?: string | null
  emailDnsVerifiedAt?: string | null
  lastValidatedAt?: string | null
  lastError?: string | null
  inboundWebhookUrl?: string
  error?: string
}

export function AdminOrganizationResendSection(props: {
  organizationId: string
  organizationSlug: string
  onUpdated?: () => void
}) {
  const { organizationId, organizationSlug, onUpdated } = props
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ResendAdminStatus | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [webhookInput, setWebhookInput] = useState("")
  const [savingKey, setSavingKey] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [savingBoth, setSavingBoth] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = (await api.admin.getOrganizationResend(organizationId)) as ResendAdminStatus
      if (!r.success) throw new Error(r.error || "Failed to load Resend status")
      setStatus(r)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load mail settings")
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void load()
  }, [load])

  const copyWebhook = async () => {
    const url = status?.inboundWebhookUrl
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Webhook URL copied")
    } catch {
      toast.error("Could not copy")
    }
  }

  const patch = async (body: { apiKey?: string; webhookSecret?: string }, mode: "key" | "wh" | "both") => {
    const setBusy =
      mode === "key" ? setSavingKey : mode === "wh" ? setSavingWebhook : setSavingBoth
    setBusy(true)
    try {
      const r = (await api.admin.patchOrganizationResend(organizationId, body)) as {
        success?: boolean
        message?: string
        error?: string
      }
      if (!r.success) throw new Error(r.error || "Save failed")
      toast.success(r.message || "Saved")
      setApiKeyInput("")
      setWebhookInput("")
      await load()
      onUpdated?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  const handleSaveKey = () => {
    const k = apiKeyInput.trim()
    if (!k) {
      toast.error("Paste a Resend API key (starts with re_)")
      return
    }
    void patch({ apiKey: k }, "key")
  }

  const handleSaveWebhook = () => {
    const w = webhookInput.trim()
    if (!w) {
      toast.error("Paste the webhook signing secret from Resend")
      return
    }
    void patch({ webhookSecret: w }, "wh")
  }

  const handleSaveBoth = () => {
    const k = apiKeyInput.trim()
    const w = webhookInput.trim()
    if (!k || !w) {
      toast.error("Enter both API key and webhook signing secret")
      return
    }
    void patch({ apiKey: k, webhookSecret: w }, "both")
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const r = (await api.emails.verifyDns(organizationId)) as {
        success?: boolean
        error?: string
        message?: string
      }
      if (r.success) toast.success(r.message || "Resend domain verified")
      else toast.error(r.error || "Verification failed")
      await load()
      onUpdated?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      await api.admin.clearOrganizationResend(organizationId)
      toast.success("Resend credentials cleared")
      setClearOpen(false)
      await load()
      onUpdated?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed")
    } finally {
      setClearing(false)
    }
  }

  const tenantMailLink = `/${organizationSlug}/emails`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] via-background to-cyan-500/[0.04] shadow-sm">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Mail delivery (Resend)</CardTitle>
                <CardDescription className="max-w-xl">
                  Per-tenant Resend project credentials. Workspace users no longer see or edit secrets — only this admin
                  console.
                </CardDescription>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={tenantMailLink} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open tenant mail UI
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Resend status…
            </div>
          ) : status ? (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusChip
                  ok={!!status.emailDomain}
                  label={status.emailDomain ? `Domain · ${status.emailDomain}` : "No email domain linked"}
                />
                <StatusChip ok={!!status.hasApiKey} label={status.hasApiKey ? "API key on file" : "API key missing"} />
                <StatusChip
                  ok={!!status.hasWebhookSecret}
                  label={status.hasWebhookSecret ? "Webhook secret on file" : "Webhook secret missing"}
                />
                <StatusChip
                  ok={!!status.emailDnsVerifiedAt}
                  label={status.emailDnsVerifiedAt ? "DNS / Resend verified" : "Not verified with Resend"}
                />
              </div>

              {!status.secretsKeyConfigured && (
                <div
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm",
                    status.secretsKeyIssue === "invalid_format"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                      : "border-border bg-muted/40 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Shield className="h-4 w-4 shrink-0" />
                    Server encryption key
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed">
                    {status.secretsKeyIssue === "invalid_format" ? (
                      <>
                        <code className="rounded bg-background/80 px-1">LUMINUM_EMAIL_SECRETS_KEY</code> is invalid — use 64
                        hex characters (e.g. <code className="rounded bg-background/80 px-1">openssl rand -hex 32</code>).
                        Credentials still save using a fallback encoding.
                      </>
                    ) : (
                      <>
                        Optional: set <code className="rounded bg-background/80 px-1">LUMINUM_EMAIL_SECRETS_KEY</code> (64
                        hex chars) on the API for AES encryption at rest.
                      </>
                    )}
                  </p>
                </div>
              )}

              {status.lastError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <span className="font-medium">Last error: </span>
                  {status.lastError}
                </div>
              )}

              {status.maskedApiKey && (
                <p className="text-xs text-muted-foreground">
                  Stored key: <span className="font-mono text-foreground">{status.maskedApiKey}</span>
                  {status.lastValidatedAt && (
                    <span className="ml-2">
                      · Last validated {new Date(status.lastValidatedAt).toLocaleString()}
                    </span>
                  )}
                </p>
              )}

              <div className="rounded-xl border bg-card/80 p-4 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Webhook className="h-3.5 w-3.5" />
                    Inbound webhook
                  </p>
                  <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => void copyWebhook()}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy URL
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  In Resend → <strong>Webhooks</strong>, add this endpoint and subscribe to{" "}
                  <code className="rounded bg-muted px-1">email.received</code>.
                </p>
                <code className="block break-all rounded-lg bg-muted/80 px-3 py-2.5 text-xs font-mono leading-relaxed border">
                  {status.inboundWebhookUrl || "—"}
                </code>
              </div>

              <Separator />

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4 text-violet-500" />
                    Resend API key
                  </div>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder="re_…"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="font-mono text-sm h-10"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Must belong to the same Resend project where <strong>{status.emailDomain || "the mail domain"}</strong> is
                    added and verified.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingKey || savingBoth}
                    onClick={() => void handleSaveKey()}
                  >
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save API key only
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Webhook className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    Webhook signing secret
                  </div>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder="whsec_… or Svix secret from Resend"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    className="font-mono text-sm h-10"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    From the webhook configuration in Resend (Svix signing secret). Save the API key first if this tenant has
                    none yet.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={savingWebhook || savingBoth}
                    onClick={() => void handleSaveWebhook()}
                  >
                    {savingWebhook ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save webhook secret only
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" disabled={savingBoth || savingKey || savingWebhook} onClick={() => void handleSaveBoth()}>
                  {savingBoth ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save API key &amp; webhook together
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={verifying || !status.hasApiKey || !status.emailDomain}
                  onClick={() => void handleVerify()}
                  className="gap-1.5"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Re-verify with Resend
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void load()} className="text-muted-foreground">
                  Refresh status
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1"
                  onClick={() => setClearOpen(true)}
                  disabled={!status.hasApiKey && !status.hasWebhookSecret}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear credentials
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Resend credentials?</AlertDialogTitle>
            <AlertDialogDescription>
              This organization will not be able to send or receive mail through Resend until new credentials are saved.
              Inbound webhooks will fail until a new signing secret is stored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearing}
              onClick={(e) => {
                e.preventDefault()
                void handleClear()
              }}
            >
              {clearing ? "Clearing…" : "Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal py-1 px-2.5",
        ok
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-muted-foreground/25 bg-muted/40 text-muted-foreground"
      )}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </Badge>
  )
}
