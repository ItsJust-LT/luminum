'use client'

import { useEffect, useState } from 'react'
import { useDisplayMode } from '@/lib/hooks/use-display-mode'

const MAX_MOBILE_WIDTH = 767

/**
 * Use native-like app shell (bottom tabs, compact header) when the app is installed
 * as a PWA or when the viewport is phone-sized — not only in standalone mode.
 */
export function usePreferAppShell(): {
  preferAppShell: boolean
  isReady: boolean
} {
  const { isStandalone, isReady: displayReady } = useDisplayMode()
  const [narrow, setNarrow] = useState(false)
  const [viewportReady, setViewportReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MAX_MOBILE_WIDTH}px)`)
    const apply = () => setNarrow(mq.matches)
    apply()
    setViewportReady(true)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const isReady = displayReady && viewportReady
  const preferAppShell = isStandalone || narrow

  return { preferAppShell, isReady }
}
