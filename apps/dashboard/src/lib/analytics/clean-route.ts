/** Normalize analytics paths for display (pathname only, leading slash). */
export function cleanAnalyticsPath(raw: string): string {
  let path = raw.trim()
  try {
    if (path.includes("://")) {
      path = new URL(path).pathname
    }
  } catch {
    /* keep path */
  }
  if (!path.startsWith("/")) path = `/${path}`
  return path
}
