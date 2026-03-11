import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Mail } from "lucide-react"

export function TeamSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-primary/10 rounded-xl shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Skeleton className="h-6 sm:h-8 w-28 sm:w-32 mb-2" />
            <Skeleton className="h-3 sm:h-4 w-40 sm:w-48" />
          </div>
        </div>
        <Skeleton className="h-9 sm:h-10 w-28 sm:w-32 rounded-lg" />
      </div>

      <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-0 divide-y divide-border/50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
          </div>
          <Skeleton className="h-3 sm:h-4 w-48 sm:w-56 mt-2" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-0 divide-y divide-border/50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



