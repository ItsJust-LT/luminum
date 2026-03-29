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
