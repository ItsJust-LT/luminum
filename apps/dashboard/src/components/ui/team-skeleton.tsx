import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Users, Mail } from "lucide-react"

export function TeamSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-36 sm:w-44" staggerIndex={0} />
              <Skeleton className="h-4 w-full max-w-xl" staggerIndex={1} />
              <Skeleton className="h-3 w-40" staggerIndex={2} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-9 w-full rounded-md sm:w-40" staggerIndex={3} />
            <Skeleton className="h-9 w-full rounded-md sm:w-36" staggerIndex={4} />
            <Skeleton className="h-9 w-full rounded-md sm:w-36" staggerIndex={5} />
          </div>
        </div>
        <Separator />
      </header>

      <Card className="app-card overflow-hidden">
        <CardHeader className="px-4 pb-3 sm:px-6">
          <Skeleton className="h-5 w-24" staggerIndex={6} />
          <Skeleton className="mt-1 h-3 w-64" staggerIndex={7} />
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="divide-border/60 divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-4 first:pt-0">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" staggerIndex={8 + i} />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" staggerIndex={8 + i} />
                  <Skeleton className="h-3 w-52" staggerIndex={8 + i} />
                </div>
                <Skeleton className="h-8 w-20 shrink-0 rounded-md" staggerIndex={8 + i} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="app-card overflow-hidden">
        <CardHeader className="px-4 pb-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground h-4 w-4" />
            <Skeleton className="h-5 w-40" staggerIndex={12} />
          </div>
          <Skeleton className="mt-1 h-3 w-56" staggerIndex={13} />
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="divide-border/60 divide-y">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" staggerIndex={14 + i} />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" staggerIndex={14 + i} />
                    <Skeleton className="h-3 w-64" staggerIndex={14 + i} />
                  </div>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <Skeleton className="h-8 w-20 rounded-full" staggerIndex={14 + i} />
                  <Skeleton className="h-8 w-24 rounded-md" staggerIndex={14 + i} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
