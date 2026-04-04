import type { OrgFeatureBooleans } from "@luminum/org-permissions"

/** Normalize organization row into strict feature flags for permission filtering. */
export function orgFeatureFlagsFromOrganization(org: {
  emails_enabled?: boolean | null
  whatsapp_enabled?: boolean | null
  analytics_enabled?: boolean | null
  blogs_enabled?: boolean | null
  invoices_enabled?: boolean | null
} | null): OrgFeatureBooleans {
  if (!org) return {}
  return {
    emails_enabled: org.emails_enabled === true,
    whatsapp_enabled: org.whatsapp_enabled === true,
    analytics_enabled: org.analytics_enabled === true,
    blogs_enabled: org.blogs_enabled === true,
    invoices_enabled: org.invoices_enabled === true,
  }
}
