"use client"

import { useLayoutEffect } from "react"
import { configureBoneyard } from "boneyard-js/react"
import "@/bones/registry"

/**
 * Aligns boneyard-js runtime defaults with dashboard skeletons (shimmer, stagger, fade-out).
 * Safe to mount once under Providers.
 */
export function BoneyardInit() {
  useLayoutEffect(() => {
    configureBoneyard({
      animate: "shimmer",
      stagger: 72,
      transition: 280,
      color: "rgba(0,0,0,0.07)",
      darkColor: "rgba(255,255,255,0.085)",
    })
  }, [])
  return null
}
