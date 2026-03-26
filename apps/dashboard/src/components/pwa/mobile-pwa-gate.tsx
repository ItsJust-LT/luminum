'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useDisplayMode } from '@/lib/hooks/use-display-mode'
import { isMobileDevice } from '@/lib/pwa/is-mobile'
import { isMobileGateAllowed } from '@/lib/pwa/mobile-gate-paths'

export function MobilePwaGate({ children }: { children: ReactNode }) {
  const { isStandalone, isReady } = useDisplayMode()
  const pathname = usePathname()
  const router = useRouter()
  const [mobile, setMobile] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setMobile(isMobileDevice())
    setChecked(true)
  }, [])

  const ready = isReady && checked

  useEffect(() => {
    if (!ready) return
    if (!mobile || isStandalone) return
    if (isMobileGateAllowed(pathname)) return
    router.replace('/install')
  }, [ready, mobile, isStandalone, pathname, router])

  if (!ready) {
    return (
      <AnimatePresence>
        <motion.div
          key="pwa-gate-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Loading&hellip;</span>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Non-standalone mobile on a gated path — will redirect via the effect above;
  // render nothing to avoid flashing the protected page.
  if (mobile && !isStandalone && !isMobileGateAllowed(pathname)) {
    return null
  }

  return <>{children}</>
}
