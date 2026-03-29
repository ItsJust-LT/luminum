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

/**
 * Absolute icon URL for tab / PWA / manifest on the current host.
 * Uses org logo when set; otherwise the public initials SVG proxy.
 */
export function absoluteBrandingIconUrl(input: {
  host: string
  proto: string
  orgName: string
  orgLogo: string | null | undefined
}): { url: string; type: string } {
  const base = input.host ? `${input.proto}://${input.host.replace(/:\d+$/, "")}` : ""
  const trimmed = input.orgLogo?.trim()
  if (trimmed) {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return { url: trimmed, type: guessImageMimeFromUrl(trimmed) }
    }
    if (trimmed.startsWith("/")) {
      const url = base ? `${base}${trimmed}` : trimmed
      return { url, type: guessImageMimeFromUrl(trimmed) }
    }
    return { url: trimmed, type: "image/png" }
  }
  const q = encodeURIComponent(input.orgName)
  const path = `/api/proxy/api/public/org-brand?name=${q}`
  return {
    url: base ? `${base}${path}` : path,
    type: "image/svg+xml",
  }
}
