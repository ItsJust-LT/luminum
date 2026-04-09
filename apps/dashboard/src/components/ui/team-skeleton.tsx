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
              <Skeleton className="h-8 w-36 sm:w-44" />
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-9 w-full rounded-md sm:w-40" />
            <Skeleton className="h-9 w-full rounded-md sm:w-36" />
            <Skeleton className="h-9 w-full rounded-md sm:w-36" />
          </div>
        </div>
        <Separator />
      </header>

      <Card className="app-card overflow-hidden">
        <CardHeader className="px-4 pb-3 sm:px-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1 h-3 w-64" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="divide-border/60 divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-4 first:pt-0">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="app-card overflow-hidden">
        <CardHeader className="px-4 pb-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground h-4 w-4" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="mt-1 h-3 w-56" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="divide-border/60 divide-y">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
