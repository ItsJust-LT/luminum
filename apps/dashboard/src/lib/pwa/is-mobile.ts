/**
 * Client-side mobile detection via UA + viewport heuristic.
 * Matches the pattern formerly in install-prompt.tsx.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) return true
  // iPadOS "Request Desktop Website" reports a Mac UA but has touch
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true
  return false
}
