/**
 * Same-origin paths allowed after sign-in / OAuth (open-redirect hardening).
 * Includes join links, invitation callbacks, and the main dashboard entry.
 */
const ALLOWED_PATH_PREFIXES = [
  "/join",
  "/accept-org-invitation",
  "/accept-owner-invitation",
  "/accept-invitation",
  "/dashboard",
] as const

export function safePostAuthRedirect(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return null
  try {
    const u = new URL(t, "https://invalid.example")
    if (u.protocol !== "https:" || u.host !== "invalid.example") return null
    const path = u.pathname
    const ok = ALLOWED_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
    if (!ok) return null
    return u.pathname + u.search + u.hash
  } catch {
    return null
  }
}
