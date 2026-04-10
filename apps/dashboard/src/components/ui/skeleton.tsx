import type { ComponentProps } from "react"
import { BONEYARD_STAGGER_MS } from "@/lib/boneyard-skeleton-tokens"
import { cn } from "@/lib/utils"

const STAGGER_MS = BONEYARD_STAGGER_MS

export interface SkeletonProps extends ComponentProps<"div"> {
  /** Stagger offset; delay = index × `BONEYARD_STAGGER_MS` (see `BoneyardInit`). */
  staggerIndex?: number
}

function Skeleton({ className, staggerIndex, style, ...props }: SkeletonProps) {
  const delayMs = staggerIndex != null ? staggerIndex * STAGGER_MS : undefined
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "skeleton-boneyard relative overflow-hidden rounded-md",
        className
      )}
      style={{
        animationDelay: delayMs != null ? `${delayMs}ms` : undefined,
        ...style,
      }}
      {...props}
    />
  )
}

export { Skeleton }
