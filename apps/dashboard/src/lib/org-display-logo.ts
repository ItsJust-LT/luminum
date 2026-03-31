import { orgBrandIconProxyUrl } from "@/lib/org-brand-icon"

/** True when the organization has a stored logo URL (S3/proxy URLs often have no file extension). */
export function hasUploadedOrgLogo(logo: string | null | undefined): boolean {
  return typeof logo === "string" && logo.trim().length > 0
}

/**
 * Absolute URL for an org logo path or full URL (for metadata, PWA, Open Graph).
 */
export function toAbsoluteOrgLogoUrl(logo: string, host: string, proto: string): string {
  const t = logo.trim()
  if (t.startsWith("http://") || t.startsWith("https://")) return t
  const base = host ? `${proto}://${host.replace(/:\d+$/, "")}` : ""
  if (!base) return t.startsWith("/") ? t : `/${t}`
  return `${base}${t.startsWith("/") ? t : `/${t}`}`
}

/** `<img src>` / Avatar: uploaded file or initials SVG from API. */
export function orgLogoOrBrandProxy(
  logo: string | null | undefined,
  organizationName: string,
): string {
  if (hasUploadedOrgLogo(logo)) return logo!.trim()
  return orgBrandIconProxyUrl(organizationName)
}
