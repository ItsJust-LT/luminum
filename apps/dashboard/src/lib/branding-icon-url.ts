import { isRasterImageUrl } from "@/lib/org-brand-initials"

/** MIME for <link type="> and manifest icon entries. */
export function guessImageMimeFromUrl(url: string): string {
  const u = url.split("?")[0]?.toLowerCase() || ""
  if (u.endsWith(".svg")) return "image/svg+xml"
  if (u.endsWith(".png")) return "image/png"
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg"
  if (u.endsWith(".webp")) return "image/webp"
  if (u.endsWith(".gif")) return "image/gif"
  return "image/png"
}

function pwaPngPath(size: number): string {
  return `/api/branding/pwa-icon?size=${size}`
}

/**
 * PNG (or raster logo) URLs for tabs, install UI, and manifest.
 * Chrome/Android often ignore SVG manifest icons and fall back to static Luminum PNGs.
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
  /** Prefer for OG / single link fallbacks */
  primary: string
} {
  const base = input.host ? `${input.proto}://${input.host.replace(/:\d+$/, "")}` : ""
  const trimmed = input.orgLogo?.trim()
  if (trimmed && isRasterImageUrl(trimmed)) {
    const url =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : base
          ? `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`
          : trimmed
    const type = guessImageMimeFromUrl(trimmed)
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
