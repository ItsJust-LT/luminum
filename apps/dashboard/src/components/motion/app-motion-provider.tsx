"use client"

import type { ReactNode } from "react"
import { LazyMotion, domAnimation } from "framer-motion"

/**
 * Loads a minimal Framer Motion feature set for smaller bundle; enables `m`/`motion` across the tree.
 */
export function AppMotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>
}
