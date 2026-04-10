"use client"

import { submitForm } from "@itsjust-lt/website-kit/forms"

function clientWebsiteId(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_LUMINUM_WEBSITE_ID?.trim()
  return raw || undefined
}

/** Base URL for Luminum Go analytics (script + POST /form). Defaults in website-kit if unset. */
export function luminumAnalyticsBaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_LUMINUM_ANALYTICS_URL?.trim()
  if (!raw) return undefined
  return raw.replace(/\/$/, "")
}

export type LuminumFormSubmitResult =
  | { ok: true; submissionId?: string }
  | { ok: false; error: string }

/**
 * Submit marketing forms to Luminum via website-kit (session cookie attached client-side).
 * All field values are stringified for the JSON API.
 */
export async function submitLuminumForm(options: {
  formName: string
  fields: Record<string, string | number | boolean | null | undefined>
}): Promise<LuminumFormSubmitResult> {
  const websiteId = clientWebsiteId()
  if (!websiteId) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_LUMINUM_WEBSITE_ID is not configured.",
    }
  }

  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(options.fields)) {
    if (value === undefined || value === null) continue
    fields[key] = typeof value === "string" ? value : String(value)
  }

  const result = await submitForm({
    websiteId,
    analyticsBaseUrl: luminumAnalyticsBaseUrl(),
    formName: options.formName,
    fields,
  })

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Submission failed" }
  }
  return { ok: true, submissionId: result.submissionId }
}
