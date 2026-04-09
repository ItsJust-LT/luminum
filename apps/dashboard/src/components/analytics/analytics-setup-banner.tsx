"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

type WebsiteRow = {
  id: string
  domain: string
  name?: string
  analytics: boolean
  scriptVerified: boolean
  scriptLastVerifiedAt?: string
  scriptError?: string
}

interface AnalyticsSetupBannerProps {
  websites: WebsiteRow[]
  verifying: boolean
  onRecheck: () => void
}

export function AnalyticsSetupBanner({ websites, verifying, onRecheck }: AnalyticsSetupBannerProps) {
  const withAnalytics = websites.filter((w) => w.analytics)
  const notVerified = withAnalytics.filter((w) => !w.scriptVerified)
  if (notVerified.length === 0) return null

  return (
    <Alert className="border-chart-3/35 bg-chart-3/10 text-foreground [&>svg]:text-chart-3">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Tracking script not verified</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <span className="text-muted-foreground block text-sm leading-relaxed">
          {notVerified.length === 1
            ? `Install the snippet on ${notVerified[0].domain}. Data appears after the script is live — we re-check automatically.`
            : `${notVerified.length} sites still need a verified snippet.`}
          {notVerified[0]?.scriptError ? (
            <span className="text-destructive mt-1 block text-xs">{notVerified[0].scriptError}</span>
          ) : null}
        </span>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={verifying} onClick={onRecheck}>
          {verifying ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Re-check now
        </Button>
      </AlertDescription>
    </Alert>
  )
}
