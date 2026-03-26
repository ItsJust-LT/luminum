/**
 * Paths that mobile-browser (non-PWA) users are still allowed to visit.
 * Everything else redirects to /install.
 */
export const MOBILE_GATE_ALLOWED: string[] = [
  '/',
  '/install',
  '/sign-in',
  '/accept-invitation',
  '/accept-org-invitation',
  '/accept-owner-invitation',
]

export function isMobileGateAllowed(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  return MOBILE_GATE_ALLOWED.some(
    (p) => normalized === p || normalized.startsWith(p + '/'),
  )
}
