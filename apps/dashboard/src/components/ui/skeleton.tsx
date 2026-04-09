import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const STAGGER_MS = 72

export interface SkeletonProps extends ComponentProps<"div"> {
  /** Stagger wave offset for list layouts (multiplied by ${STAGGER_MS}ms). */
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
