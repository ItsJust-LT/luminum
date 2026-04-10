import * as React from "react"

import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "bg-muted/90 text-muted-foreground border-border/70 pointer-events-none inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-md border px-2 font-sans text-[11px] font-medium leading-none tracking-tight shadow-[inset_0_-1px_0_0_color-mix(in_oklab,var(--foreground)_6%,transparent)] dark:bg-muted/50 dark:shadow-[inset_0_-1px_0_0_color-mix(in_oklab,var(--foreground)_12%,transparent)]",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
