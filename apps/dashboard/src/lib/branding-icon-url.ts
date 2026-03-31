import { hasUploadedOrgLogo, toAbsoluteOrgLogoUrl } from "@/lib/org-display-logo"

/** MIME hint for <link type> / manifest (proxy URLs may omit extensions). */
export function guessImageMimeFromUrl(url: string): string {
  const pathOnly = url.split("?")[0]?.toLowerCase() || ""
  if (pathOnly.endsWith(".svg")) return "image/svg+xml"
  if (pathOnly.endsWith(".png")) return "image/png"
  if (pathOnly.endsWith(".jpg") || pathOnly.endsWith(".jpeg")) return "image/jpeg"
  if (pathOnly.endsWith(".webp")) return "image/webp"
  if (pathOnly.endsWith(".gif")) return "image/gif"
  if (pathOnly.includes("/api/files/") || pathOnly.includes("/api/proxy/")) return "image/png"
  return "image/png"
}

function pwaPngPath(size: number): string {
  return `/api/branding/pwa-icon?size=${size}`
}

/**
 * Icons for tabs, manifest, install: use uploaded logo when present; otherwise generated initials PNG.
 */
export function absoluteBrandingIconUrls(input: {
  host: string
  proto: string
  orgName: string
  orgLogo: string | null | undefined
}): {
  icon192: string
  icon512: string
  icon180: string
  type: string
  primary: string
} {
  const base = input.host ? `${input.proto}://${input.host.replace(/:\d+$/, "")}` : ""
  const trimmed = input.orgLogo?.trim()

  if (hasUploadedOrgLogo(trimmed)) {
    const url = toAbsoluteOrgLogoUrl(trimmed!, input.host, input.proto)
    const type = guessImageMimeFromUrl(trimmed!)
    return { icon192: url, icon512: url, icon180: url, type, primary: url }
  }

  const abs = (path: string) => (base ? `${base}${path}` : path)
  const icon192 = abs(pwaPngPath(192))
  const icon512 = abs(pwaPngPath(512))
  const icon180 = abs(pwaPngPath(180))
  return {
    icon192,
    icon512,
    icon180,
    type: "image/png",
    primary: icon512,
  }
}

export function absoluteBrandingIconUrl(input: {
  host: string
  proto: string
  orgName: string
  orgLogo: string | null | undefined
}): { url: string; type: string } {
  const u = absoluteBrandingIconUrls(input)
  return { url: u.primary, type: u.type }
}
