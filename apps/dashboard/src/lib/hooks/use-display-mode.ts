'use client'

import { useEffect, useState } from 'react'

export interface DisplayMode {
  /** App is running as installed PWA (standalone/fullscreen) */
  isStandalone: boolean
  /** Running on iOS (for install UI and safe-area) */
  isIOS: boolean
  /** True after first client-side check (avoids hydration mismatch) */
  isReady: boolean
}

const isIOSUserAgent = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as unknown as { MSStream?: boolean }).MSStream

function getStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * Detects PWA display mode and platform for app shell vs website layout and install prompts.
 * Use isReady before switching layout to avoid hydration mismatch.
 */
export function useDisplayMode(): DisplayMode {
  const [state, setState] = useState<DisplayMode>({
    isStandalone: false,
    isIOS: false,
    isReady: false,
  })

  useEffect(() => {
    const isIOS = isIOSUserAgent()
    const isStandalone = getStandalone()

    setState({
      isStandalone,
      isIOS,
      isReady: true,
    })

    const mq = window.matchMedia('(display-mode: standalone)')
    const listener = () => {
      setState((prev) => ({
        ...prev,
        isStandalone: getStandalone(),
      }))
    }
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  return state
}
