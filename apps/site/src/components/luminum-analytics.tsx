"use client"

import { AnalyticsScript } from "@itsjust-lt/website-kit/analytics"
import { isValidWebsiteId, normalizeWebsiteId } from "@itsjust-lt/website-kit/env"

type Props = {
  websiteId: string | undefined
  analyticsBaseUrl: string | undefined
}

/**
 * Renders the Luminum tracker only when a valid public Website ID is set.
 * Loads after hydration (client component) to satisfy website-kit assertions.
 */
export function LuminumAnalytics({ websiteId, analyticsBaseUrl }: Props) {
  const raw = websiteId?.trim()
  if (!raw || !isValidWebsiteId(raw)) {
    return null
  }
  return (
    <AnalyticsScript
      websiteId={normalizeWebsiteId(raw)}
      analyticsBaseUrl={analyticsBaseUrl?.trim().replace(/\/$/, "") || undefined}
    />
  )
}
