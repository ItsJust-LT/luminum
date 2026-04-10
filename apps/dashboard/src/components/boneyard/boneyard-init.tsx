"use client"

import { useLayoutEffect } from "react"
import { configureBoneyard } from "boneyard-js/react"
import "@/bones/registry"
import { BONEYARD_STAGGER_MS } from "@/lib/boneyard-skeleton-tokens"

/**
 * Global defaults for `boneyard-js/react` `<Skeleton loading>` (bone capture / registry).
 * Manual placeholders use `@/components/ui/skeleton` + `.skeleton-boneyard` in globals.css;
 * keep `stagger` in sync with `BONEYARD_STAGGER_MS` there and on `staggerIndex` props.
 */
export function BoneyardInit() {
  useLayoutEffect(() => {
    configureBoneyard({
      animate: "shimmer",
      stagger: BONEYARD_STAGGER_MS,
      transition: 280,
      color: "rgba(0,0,0,0.07)",
      darkColor: "rgba(255,255,255,0.085)",
    })
  }, [])
  return null
}
