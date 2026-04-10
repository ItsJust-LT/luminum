"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { AuditDetail } from "@/lib/types/audits"

export type AuditPageResultRow = NonNullable<NonNullable<AuditDetail["metrics"]>["pageResults"]>[number]

const GRADE_ORDER = ["A", "B", "C", "D", "F"] as const

const gradeChartConfig = {
  count: { label: "Pages", color: "var(--chart-1)" },
} satisfies ChartConfig

const deviceChartConfig = {
  count: { label: "Runs", color: "var(--chart-2)" },
} satisfies ChartConfig

const scoreBandConfig = {
  count: { label: "Pages", color: "var(--chart-3)" },
} satisfies ChartConfig

const GRADE_COLORS: Record<string, string> = {
  A: "var(--chart-2)",
  B: "var(--chart-5)",
  C: "var(--chart-3)",
  D: "var(--chart-4)",
  F: "hsl(var(--destructive))",
}

export function AuditResultsCharts({ rows }: { rows: AuditPageResultRow[] }) {
  const gradeData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const g of GRADE_ORDER) counts.set(g, 0)
    for (const r of rows) {
      if (r.status !== "completed" || !r.summary?.grade) continue
      const g = r.summary.grade
      counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    return GRADE_ORDER.map((grade) => ({ grade, count: counts.get(grade) ?? 0 }))
  }, [rows])

  const deviceData = useMemo(() => {
    let mobile = 0
    let desktop = 0
    for (const r of rows) {
      if (r.device === "mobile") mobile += 1
      else desktop += 1
    }
    return [
      { name: "Mobile", count: mobile, fill: "var(--chart-1)" },
      { name: "Desktop", count: desktop, fill: "var(--chart-2)" },
    ]
  }, [rows])

  const scoreBandData = useMemo(() => {
    const bands = [
      { band: "0–49", min: 0, max: 49, count: 0 },
      { band: "50–69", min: 50, max: 69, count: 0 },
      { band: "70–89", min: 70, max: 89, count: 0 },
      { band: "90–100", min: 90, max: 100, count: 0 },
    ]
    for (const r of rows) {
      if (r.status !== "completed" || r.summary?.performanceScore == null) continue
      const s = r.summary.performanceScore
      const b = bands.find((x) => s >= x.min && s <= x.max)
      if (b) b.count += 1
    }
    return bands.map(({ band, count }) => ({ band, count }))
  }, [rows])

  const completedWithScore = rows.filter(
    (r) => r.status === "completed" && r.summary?.performanceScore != null
  ).length

  if (rows.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight">Distribution</h2>
      <p className="text-muted-foreground text-sm">
        Based on {rows.length} row{rows.length === 1 ? "" : "s"} in the current filter
        {completedWithScore > 0 ? ` · ${completedWithScore} with scores` : ""}.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="app-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grades</CardTitle>
            <CardDescription>Completed runs by Lighthouse grade</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={gradeChartConfig} className="mx-auto aspect-[4/3] max-h-[220px] w-full sm:aspect-video sm:max-h-[200px]">
              <BarChart data={gradeData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis dataKey="grade" tickLine={false} axisLine={false} />
                <YAxis width={32} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeData.map((entry) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] ?? "var(--muted-foreground)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Device</CardTitle>
            <CardDescription>Rows by form factor</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={deviceChartConfig} className="mx-auto aspect-[4/3] max-h-[220px] w-full sm:aspect-video sm:max-h-[200px]">
              <BarChart data={deviceData} layout="vertical" margin={{ left: 16, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={56} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {deviceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="app-card lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Performance score</CardTitle>
            <CardDescription>Completed pages by score band</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={scoreBandConfig} className="mx-auto aspect-[4/3] max-h-[220px] w-full sm:aspect-video sm:max-h-[200px]">
              <BarChart data={scoreBandData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis dataKey="band" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis width={32} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
