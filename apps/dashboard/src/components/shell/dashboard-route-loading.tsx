import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const pad = "w-full min-h-0 px-3 pt-4 sm:px-4 md:px-6 sm:pt-5 md:pt-6 space-y-4 sm:space-y-5 md:space-y-6"

/** Home / generic marketing-style shell */
export function RootPageLoadingSkeleton() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 py-12 sm:py-16">
      <Skeleton className="mb-5 h-14 w-14 rounded-2xl sm:h-16 sm:w-16" staggerIndex={0} />
      <Skeleton className="mb-2 h-8 w-44 sm:w-52" staggerIndex={1} />
      <Skeleton className="mb-8 h-4 w-64 max-w-[90vw] sm:w-80" staggerIndex={2} />
      <div className="flex w-full max-w-md flex-col gap-3">
        <Skeleton className="h-11 w-full rounded-xl sm:h-12" staggerIndex={3} />
        <Skeleton className="h-11 w-full rounded-xl sm:h-12" staggerIndex={4} />
      </div>
    </div>
  )
}

/** Organization workspace main content (inside shell) */
export function OrgSlugRouteLoadingSkeleton() {
  return (
    <div className={cn(pad, "app-page")}>
      <div className="app-hero relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl sm:h-12 sm:w-12" staggerIndex={0} />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 max-w-[70vw] sm:h-8 sm:w-56" staggerIndex={1} />
              <Skeleton className="h-4 max-w-[85vw] w-48 sm:w-64" staggerIndex={2} />
            </div>
          </div>
          <Skeleton className="h-9 w-full shrink-0 rounded-lg sm:w-36" staggerIndex={3} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="app-card rounded-xl border border-border/50 bg-card/50 p-4 shadow-sm sm:p-5"
          >
            <Skeleton className="mb-3 h-9 w-9 rounded-xl sm:h-10 sm:w-10" staggerIndex={4 + n} />
            <Skeleton className="mb-2 h-6 w-16 sm:h-8 sm:w-20" staggerIndex={4 + n} />
            <Skeleton className="h-3 w-20 sm:w-24" staggerIndex={4 + n} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-8">
          <div className="app-card rounded-xl border border-border/60 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-5 w-36 sm:w-44" staggerIndex={8} />
              <Skeleton className="h-8 w-24 rounded-md sm:w-28" staggerIndex={9} />
            </div>
            <Skeleton className="h-[200px] w-full rounded-xl sm:h-[260px] md:h-[300px]" staggerIndex={10} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((n) => (
                <Skeleton key={n} className="h-16 w-full rounded-lg" staggerIndex={11 + n} />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 lg:col-span-4">
          <div className="app-card rounded-xl border border-border/60 p-4 sm:p-6">
            <Skeleton className="mb-4 h-5 w-32" staggerIndex={14} />
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-11 w-full rounded-lg sm:h-12" staggerIndex={15 + n} />
              ))}
            </div>
          </div>
          <div className="app-card rounded-xl border border-border/60 p-4 sm:p-6">
            <Skeleton className="mb-3 h-5 w-28" staggerIndex={20} />
            <Skeleton className="h-24 w-full rounded-lg sm:h-28" staggerIndex={21} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** /dashboard org picker */
export function DashboardOrganizationsLoadingSkeleton() {
  return (
    <div className={cn(pad, "mx-auto max-w-2xl")}>
      <div className="mb-8 space-y-3 text-center sm:mb-10">
        <Skeleton className="mx-auto h-9 w-48 sm:h-10 sm:w-56" staggerIndex={0} />
        <Skeleton className="mx-auto h-4 w-full max-w-sm" staggerIndex={1} />
      </div>
      <div className="space-y-3 sm:space-y-4">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-4 sm:p-5"
          >
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" staggerIndex={2 + n} />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-[60%]" staggerIndex={2 + n} />
              <Skeleton className="h-3 w-56 max-w-[90%]" staggerIndex={2 + n} />
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" staggerIndex={2 + n} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Admin console */
export function AdminRouteLoadingSkeleton() {
  return (
    <div className={cn(pad, "max-w-7xl")}>
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:h-9 sm:w-56" staggerIndex={0} />
          <Skeleton className="h-4 w-72 max-w-full" staggerIndex={1} />
        </div>
        <Skeleton className="h-10 w-full rounded-lg sm:w-40" staggerIndex={2} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="app-card rounded-xl border p-5">
            <Skeleton className="mb-4 h-10 w-10 rounded-xl" staggerIndex={3 + n} />
            <Skeleton className="mb-2 h-6 w-24" staggerIndex={3 + n} />
            <Skeleton className="h-4 w-full" staggerIndex={3 + n} />
            <Skeleton className="mt-3 h-3 w-2/3" staggerIndex={3 + n} />
          </div>
        ))}
      </div>
      <div className="app-card rounded-xl border p-4 sm:p-6">
        <Skeleton className="mb-4 h-5 w-40" staggerIndex={10} />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-12 w-full rounded-lg" staggerIndex={11 + n} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Account settings */
export function AccountSettingsLoadingSkeleton() {
  return (
    <div className={cn(pad, "mx-auto max-w-3xl")}>
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-44" staggerIndex={0} />
        <Skeleton className="h-4 w-64 max-w-full" staggerIndex={1} />
      </div>
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="app-card space-y-4 rounded-xl border p-5 sm:p-6">
            <Skeleton className="h-5 w-36" staggerIndex={2 + i * 4} />
            <Skeleton className="h-10 w-full rounded-lg" staggerIndex={3 + i * 4} />
            <Skeleton className="h-10 w-full rounded-lg" staggerIndex={4 + i * 4} />
            <Skeleton className="h-24 w-full rounded-lg" staggerIndex={5 + i * 4} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Sign-in / narrow auth */
export function AuthRouteLoadingSkeleton() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <Skeleton className="mx-auto mb-8 h-12 w-12 rounded-xl" staggerIndex={0} />
      <Skeleton className="mx-auto mb-2 h-8 w-56 max-w-[85%]" staggerIndex={1} />
      <Skeleton className="mb-8 h-4 w-full max-w-sm self-center" staggerIndex={2} />
      <Skeleton className="mb-3 h-11 w-full rounded-lg" staggerIndex={3} />
      <Skeleton className="mb-3 h-11 w-full rounded-lg" staggerIndex={4} />
      <Skeleton className="mt-4 h-11 w-full rounded-lg" staggerIndex={5} />
    </div>
  )
}

/**
 * Matches org Analytics page: header (icon + title + live strip), separator,
 * date toolbar, KPI row (AnalyticsKpiGrid-style), primary chart card, two-column row.
 */
export function AnalyticsPageLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full min-h-0 px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6",
        "mx-auto max-w-[1600px] space-y-6 sm:space-y-8",
        className
      )}
    >
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" staggerIndex={0} />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-8 w-40 max-w-[75vw] sm:w-48" staggerIndex={1} />
                <Skeleton className="h-4 w-full max-w-2xl" staggerIndex={2} />
              </div>
            </div>
            <Skeleton className="h-4 w-44 max-w-[85vw]" staggerIndex={3} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-border/60 pt-2 lg:border-0 lg:pt-0 lg:justify-end">
            <Skeleton className="h-8 w-28 rounded-full" staggerIndex={4} />
            <Skeleton className="h-8 w-24 rounded-full" staggerIndex={5} />
          </div>
        </div>
        <div className="bg-border h-px w-full shrink-0" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Skeleton className="h-4 w-20" staggerIndex={6} />
            <Skeleton className="h-9 w-full rounded-md sm:w-[min(100%,220px)]" staggerIndex={7} />
          </div>
          <Skeleton className="h-9 w-full rounded-md sm:w-28" staggerIndex={8} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="app-card rounded-xl border border-border/50 bg-card/50 p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" staggerIndex={9 + n} />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-24" staggerIndex={9 + n} />
                <Skeleton className="h-8 w-28 sm:h-9" staggerIndex={9 + n} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="app-card border-border/50 rounded-xl border p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" staggerIndex={13} />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44 sm:w-52" staggerIndex={14} />
            <Skeleton className="h-4 w-full max-w-xl" staggerIndex={15} />
          </div>
        </div>
        <Skeleton className="mt-5 h-[320px] w-full rounded-xl sm:h-[380px] md:h-[400px]" staggerIndex={16} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="app-card rounded-xl border border-border/60 p-4 sm:p-6">
          <Skeleton className="mb-3 h-5 w-36" staggerIndex={17} />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-10 w-full rounded-lg sm:h-11" staggerIndex={18 + n} />
            ))}
          </div>
        </div>
        <div className="app-card rounded-xl border border-border/60 p-4 sm:p-6">
          <Skeleton className="mb-3 h-5 w-36" staggerIndex={23} />
          <Skeleton className="h-52 w-full rounded-xl sm:h-56" staggerIndex={24} />
        </div>
      </div>
    </div>
  )
}

/** Analytics, audits, reports — shared chart-dashboard placeholder */
export function ChartPageLoadingSkeleton() {
  return <AnalyticsPageLoadingSkeleton />
}

/** Forms, invoices, blogs list — toolbar + dense rows */
export function TablePageLoadingSkeleton() {
  return (
    <div className={cn(pad, "app-page")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 sm:h-9 sm:w-52" staggerIndex={0} />
          <Skeleton className="h-4 w-64 max-w-full" staggerIndex={1} />
        </div>
        <Skeleton className="h-10 w-full rounded-lg sm:w-36" staggerIndex={2} />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-center sm:p-4">
        <Skeleton className="h-10 w-full rounded-lg sm:max-w-xs" staggerIndex={3} />
        <Skeleton className="h-10 w-full rounded-lg sm:max-w-[10rem]" staggerIndex={4} />
        <Skeleton className="h-10 w-full rounded-lg sm:ml-auto sm:max-w-[8rem]" staggerIndex={5} />
      </div>
      <div className="app-card overflow-hidden rounded-xl border">
        <div className="border-b border-border/60 px-4 py-3 sm:px-6">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" staggerIndex={6} />
            <Skeleton className="h-4 w-32" staggerIndex={6} />
            <Skeleton className="hidden h-4 w-20 sm:block" staggerIndex={6} />
          </div>
        </div>
        <div className="divide-y divide-border/60">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" staggerIndex={7 + n} />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-[min(100%,14rem)]" staggerIndex={7 + n} />
                <Skeleton className="h-3 w-[min(100%,20rem)]" staggerIndex={7 + n} />
              </div>
              <Skeleton className="hidden h-8 w-20 shrink-0 rounded-md sm:block" staggerIndex={7 + n} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Mail / WhatsApp — list + preview */
export function SplitPaneLoadingSkeleton() {
  return (
    <div className={cn("flex min-h-0 w-full flex-1 gap-0", "lg:gap-4")}>
      <div className="border-border/60 flex w-full min-w-0 flex-col border-b lg:w-[min(100%,22rem)] lg:shrink-0 lg:border-b-0 lg:border-r lg:pr-2">
        <div className="flex gap-2 border-b border-border/50 p-3 sm:p-4">
          <Skeleton className="h-10 flex-1 rounded-lg" staggerIndex={0} />
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" staggerIndex={1} />
        </div>
        <div className="divide-y divide-border/50 overflow-hidden">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="flex gap-3 p-3 sm:p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" staggerIndex={2 + n} />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-[min(100%,12rem)]" staggerIndex={2 + n} />
                <Skeleton className="h-3 w-full max-w-[18rem]" staggerIndex={2 + n} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden min-h-[320px] flex-1 flex-col p-4 lg:flex lg:p-6">
        <Skeleton className="mb-4 h-6 w-48" staggerIndex={10} />
        <Skeleton className="mb-2 h-4 w-full max-w-xl" staggerIndex={11} />
        <Skeleton className="mb-6 h-4 w-56 max-w-lg" staggerIndex={12} />
        <Skeleton className="min-h-[200px] flex-1 w-full rounded-xl" staggerIndex={13} />
      </div>
    </div>
  )
}
