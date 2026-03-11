'use client'

import { cn } from '@/lib/utils'

interface AppPageContainerProps {
  children: React.ReactNode
  className?: string
  /** Skip max-width constraint for full-bleed pages */
  fullWidth?: boolean
}

/**
 * Wraps app (PWA) page content with consistent padding, safe areas, and optional max-width.
 * Use inside AppShellLayout for all [slug] pages when in standalone mode; also works in browser for consistent mobile-first layout.
 */
export function AppPageContainer({
  children,
  className,
  fullWidth = false,
}: AppPageContainerProps) {
  return (
    <div
      className={cn(
        'w-full min-h-0',
        fullWidth ? 'px-3 sm:px-4 md:px-6' : 'app-page',
        'pt-4 sm:pt-5 md:pt-6 space-y-4 sm:space-y-5 md:space-y-6',
        className
      )}
    >
      {children}
    </div>
  )
}
