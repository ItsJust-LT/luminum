'use client'

import type { ReactNode } from 'react'

/**
 * Previously redirected mobile Safari/Chrome users to /install unless the app was
 * installed. All org routes are now usable in the mobile browser with the same
 * app shell as the installed PWA.
 */
export function MobilePwaGate({ children }: { children: ReactNode }) {
  return <>{children}</>
}
