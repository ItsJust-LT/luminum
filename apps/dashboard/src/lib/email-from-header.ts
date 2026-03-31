/** Parse `addr` from `Name <addr>` or return trimmed string. */
export function extractEmailFromFromHeader(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/)
  return (m ? m[1] : fromHeader).trim()
}

/** Label for branded initials SVG (display name or email local part). */
export function displayNameForOrgBrand(fromHeader: string): string {
  const trimmed = fromHeader.trim()
  const angle = trimmed.indexOf("<")
  if (angle > 0) {
    const name = trimmed.slice(0, angle).trim().replace(/^["']|["']$/g, "")
    if (name.length > 0) return name.slice(0, 200)
  }
  const email = extractEmailFromFromHeader(trimmed)
  return email.slice(0, 200) || "?"
}

export function getPublicApiBase(): string {
  return (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : ""
  ).replace(/\/$/, "")
}
