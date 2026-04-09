"use client"

import type { ComponentType, ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Users, Clock, FileText } from "lucide-react"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { formatDuration } from "@/lib/utils"
import { LiveViewersMetricCard } from "@/components/analytics/live-visitors-counter"
import type { StatsOverview } from "@/lib/types/analytics"
import { cn } from "@/lib/utils"

interface AnalyticsKpiGridProps {
  overview: StatsOverview
  liveCount: number
  liveConnected: boolean
  className?: string
}

function KpiCard({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("app-card transition-shadow hover:shadow-md", className)}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 text-left sm:text-left">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
          <div className="text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-3xl">{children}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsKpiGrid({ overview, liveCount, liveConnected, className }: AnalyticsKpiGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5", className)}>
      <KpiCard icon={Eye} label="Page views">
        <AnimatedNumber value={overview.pageViews ?? 0} duration={700} />
      </KpiCard>
      <KpiCard icon={Users} label="Sessions">
        <AnimatedNumber value={overview.uniqueSessions ?? 0} duration={700} />
      </KpiCard>
      <KpiCard icon={Clock} label="Avg. session">
        <AnimatedNumber
          value={overview.avgDuration ?? 0}
          duration={700}
          format={(n) => formatDuration(Math.round(n))}
        />
      </KpiCard>
      <LiveViewersMetricCard liveCount={liveCount} connected={liveConnected} />
      <KpiCard icon={FileText} label="Form submissions" className="xl:col-span-1">
        <AnimatedNumber value={overview.formSubmissions ?? 0} duration={700} />
      </KpiCard>
    </div>
  )
}
