/**
 * Normalize analytics paths for display — matches API `normalizeAnalyticsPagePath`
 * (pathname only, no trailing slash except root, `/home` → `/`).
 */
export function cleanAnalyticsPath(raw: string): string {
  let path = (raw || "").trim()
  if (!path) return "/"
  try {
    if (path.includes("://")) {
      path = new URL(path).pathname
    }
  } catch {
    /* keep path */
  }
  if (!path.startsWith("/")) path = `/${path}`
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1)
  const lower = path.toLowerCase()
  if (lower === "/home" || lower === "/index" || lower === "/index.html") return "/"
  return path || "/"
}
