/**
 * On the primary host, org routes are /{slug}/….
 * On a verified custom domain, the browser URL is flat (/dashboard, /settings, …) and
 * middleware rewrites to /{slug}/… internally.
 */
export function orgNavPath(
  workspaceSlug: string,
  flatRoutes: boolean,
  section: string,
): string {
  if (flatRoutes) return `/${section}`
  return `/${workspaceSlug}/${section}`
}

/** Path segment(s) after the org slug (or flat path without slug) for permission routing. */
export function orgRelativePath(pathname: string, workspaceSlug: string, flatRoutes: boolean): string {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/"
  if (flatRoutes) {
    if (path === "/") return "dashboard"
    return path.replace(/^\//, "")
  }
  const prefix = `/${workspaceSlug}`
  if (path === prefix || path === `${prefix}/`) return "dashboard"
  if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length + 1)
  return "dashboard"
}
