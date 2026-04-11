"use client"

import { useCallback, useEffect, useState } from "react"
import { Link2, Loader2, Copy, Trash2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const MAX_DAYS = 7

type JoinLinkRow = { token: string; expiresAt: string; createdAt: string }

export function TeamJoinLinkCard({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [joinLink, setJoinLink] = useState<JoinLinkRow | null>(null)
  const [expiresInDays, setExpiresInDays] = useState(String(MAX_DAYS))

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = (await api.organizationActions.getJoinLink(organizationId)) as {
        success?: boolean
        joinLink?: JoinLinkRow | null
        error?: string
      }
      if (!res?.success) throw new Error(res?.error || "Failed to load join link")
      setJoinLink(res.joinLink ?? null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load join link")
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void load()
  }, [load])

  const fullJoinUrl =
    typeof window !== "undefined" && joinLink?.token
      ? `${window.location.origin}/join/${joinLink.token}`
      : ""

  const copyLink = async () => {
    if (!fullJoinUrl) return
    try {
      await navigator.clipboard.writeText(fullJoinUrl)
      toast.success("Join link copied")
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const createOrRotate = async () => {
    const days = Math.min(MAX_DAYS, Math.max(1, parseInt(expiresInDays, 10) || MAX_DAYS))
    try {
      setSaving(true)
      const res = (await api.organizationActions.createOrRotateJoinLink(organizationId, days)) as {
        success?: boolean
        joinLink?: JoinLinkRow
        error?: string
      }
      if (!res?.success || !res.joinLink) throw new Error(res?.error || "Could not save link")
      setJoinLink(res.joinLink)
      toast.success("Join link is ready to share")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save link")
    } finally {
      setSaving(false)
    }
  }

  const revoke = async () => {
    try {
      setSaving(true)
      await api.organizationActions.deleteJoinLink(organizationId)
      setJoinLink(null)
      toast.success("Join link removed")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not remove link")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="app-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Link2 className="text-primary h-4 w-4" />
          Open join link
        </CardTitle>
        <CardDescription>
          One link for your workspace. Anyone can use it to create an account or sign in and join as a member. For
          security, links expire in at most {MAX_DAYS} days; rotate the link anytime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 sm:px-6">
        <Alert>
          <AlertTitle className="text-sm">How it works</AlertTitle>
          <AlertDescription className="text-muted-foreground text-xs leading-relaxed">
            Share the URL with teammates. If their email is already registered, they are prompted to sign in and then
            complete join automatically. New teammates create a password or use Google, then land in the workspace.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : joinLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Active link</Label>
              <div className="bg-muted/40 border-border/60 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                <p className="text-foreground min-w-0 flex-1 break-all font-mono text-xs sm:text-sm">{fullJoinUrl}</p>
                <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1.5" onClick={() => void copyLink()}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Expires{" "}
                <span className="text-foreground font-medium">
                  {new Date(joinLink.expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={saving} onClick={() => void createOrRotate()}>
                <RefreshCw className={saving ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                Regenerate link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 gap-1.5"
                disabled={saving}
                onClick={() => void revoke()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-expires" className="text-xs font-medium">
                Link expires in
              </Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger id="join-expires" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} day{d === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" className="gap-2" disabled={saving} onClick={() => void createOrRotate()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Create join link
            </Button>
          </div>
        )}

        {!loading && joinLink ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="join-expires-rotate" className="text-xs font-medium">
                Next expiry when you regenerate
              </Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger id="join-expires-rotate" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} day{d === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
