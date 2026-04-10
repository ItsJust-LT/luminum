"use client"

import type { ReactNode } from "react"
import { m, useReducedMotion } from "framer-motion"
import { easeOut } from "@/lib/motion-presets"

/**
 * Subtle enter animation when the main workspace route updates (pathname-driven).
 */
export function MainContentMotion({
  routeKey,
  children,
}: {
  routeKey: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className="min-h-0 flex-1 flex flex-col">{children}</div>
  }

  return (
    <m.div
      key={routeKey}
      className="min-h-0 flex-1 flex flex-col"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: easeOut }}
    >
      {children}
    </m.div>
  )
}
