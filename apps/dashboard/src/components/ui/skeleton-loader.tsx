import { cn } from "@/lib/utils"

interface SkeletonLoaderProps {
  className?: string
  variant?: "default" | "card" | "text" | "avatar" | "button" | "table"
  lines?: number
  width?: string
  height?: string
}

export function SkeletonLoader({ 
  className, 
  variant = "default", 
  lines = 1, 
  width, 
  height 
}: SkeletonLoaderProps) {
  const baseClasses = "animate-pulse bg-muted rounded-md"
  
  const variants = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-4 w-3/4",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24",
    table: "h-12 w-full"
  }

  if (lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variants[variant],
              i === lines - 1 ? "w-1/2" : "w-full",
              width && `w-[${width}]`,
              height && `h-[${height}]`
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        width && `w-[${width}]`,
        height && `h-[${height}]`,
        className
      )}
    />
  )
}

// Card skeleton component
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <SkeletonLoader variant="avatar" />
          <div className="space-y-2 flex-1">
            <SkeletonLoader variant="text" />
            <SkeletonLoader variant="text" width="1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader width="3/4" />
        </div>
      </div>
    </div>
  )
}

// Table skeleton component
export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <SkeletonLoader variant="avatar" />
          <div className="flex-1 space-y-2">
            <SkeletonLoader />
            <SkeletonLoader width="1/2" />
          </div>
          <SkeletonLoader variant="button" />
        </div>
      ))}
    </div>
  )
}

// Analytics skeleton component
export function AnalyticsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="space-y-2">
              <SkeletonLoader width="1/2" />
              <SkeletonLoader variant="text" width="1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <SkeletonLoader width="1/4" />
          <SkeletonLoader variant="card" />
        </div>
      </div>
    </div>
  )
}

// Form skeleton component
export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <SkeletonLoader width="1/4" />
        <SkeletonLoader variant="button" width="1/2" />
      </div>
      <div className="space-y-2">
        <SkeletonLoader width="1/4" />
        <SkeletonLoader variant="button" width="1/2" />
      </div>
      <div className="space-y-2">
        <SkeletonLoader width="1/4" />
        <SkeletonLoader height="h-20" />
      </div>
      <div className="flex justify-end">
        <SkeletonLoader variant="button" width="w-24" />
      </div>
    </div>
  )
}
