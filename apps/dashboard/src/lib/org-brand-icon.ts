/** Same-origin URL that proxies to the API public org-brand SVG (initials). */
export function orgBrandIconProxyUrl(organizationName: string): string {
  return `/api/proxy/api/public/org-brand?name=${encodeURIComponent(organizationName)}`
}
