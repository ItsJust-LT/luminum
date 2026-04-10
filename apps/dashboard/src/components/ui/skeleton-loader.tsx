import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonLoaderProps {
  className?: string
  variant?: "default" | "card" | "text" | "avatar" | "button" | "table"
  lines?: number
  width?: string
  height?: string
  /** Base index for stagger animation across repeated loaders */
  staggerBase?: number
}

export function SkeletonLoader({
  className,
  variant = "default",
  lines = 1,
  width,
  height,
  staggerBase = 0,
}: SkeletonLoaderProps) {
  const variants = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-4 w-3/4",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24",
    table: "h-12 w-full",
  }

  if (lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              variants[variant],
              i === lines - 1 ? "w-1/2" : "w-full",
              width,
              height,
              variant === "avatar" && "rounded-full"
            )}
            staggerIndex={staggerBase + i}
          />
        ))}
      </div>
    )
  }

  return (
    <Skeleton
      className={cn(variants[variant], width, height, className)}
      staggerIndex={staggerBase}
    />
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <SkeletonLoader variant="avatar" staggerBase={0} />
          <div className="flex flex-1 flex-col space-y-2">
            <SkeletonLoader variant="text" staggerBase={1} />
            <SkeletonLoader variant="text" width="w-1/2" staggerBase={2} />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonLoader staggerBase={3} />
          <SkeletonLoader staggerBase={4} />
          <SkeletonLoader width="w-3/4" staggerBase={5} />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <SkeletonLoader variant="avatar" staggerBase={i * 3} />
          <div className="flex flex-1 flex-col space-y-2">
            <SkeletonLoader staggerBase={i * 3 + 1} />
            <SkeletonLoader width="w-1/2" staggerBase={i * 3 + 2} />
          </div>
          <SkeletonLoader variant="button" staggerBase={i * 3 + 1} />
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <SkeletonLoader width="w-1/4" staggerBase={0} />
        <SkeletonLoader variant="button" width="w-1/2" staggerBase={1} />
      </div>
      <div className="space-y-2">
        <SkeletonLoader width="w-1/4" staggerBase={2} />
        <SkeletonLoader variant="button" width="w-1/2" staggerBase={3} />
      </div>
      <div className="space-y-2">
        <SkeletonLoader width="w-1/4" staggerBase={4} />
        <Skeleton className="h-20 w-full" staggerIndex={5} />
      </div>
      <div className="flex justify-end">
        <SkeletonLoader variant="button" width="w-24" staggerBase={6} />
      </div>
    </div>
  )
}
