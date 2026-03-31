import type { Metadata } from "next"

/**
 * Page title segment for dashboard routes. Root `app/layout.tsx` applies
 * `template`: "%s | Luminum" (or "%s | {orgName}" on client custom domains).
 */
export function dashboardTitle(title: string): Metadata {
  return { title }
}
