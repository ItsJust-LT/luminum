import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Use after the route-level skeleton (or static chrome) is already visible —
 * avoids a second boneyard/shimmer pass while client data resolves.
 */
export function PageDataSpinner({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground sm:py-20",
        className
      )}
    >
      <Loader2 className="h-8 w-8 shrink-0 animate-spin" aria-hidden />
      {label ? <p className="text-center text-sm">{label}</p> : null}
    </div>
  )
}
