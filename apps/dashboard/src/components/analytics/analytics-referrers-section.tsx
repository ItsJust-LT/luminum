"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { ReferrerSourceRow } from "@/lib/types/analytics";
import { Link2, MousePointerClick } from "lucide-react";

const referrerChartConfig = {
  count: {
    label: "Page views",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig;

function kindBadgeClass(kind: string): string {
  switch (kind) {
    case "search":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
    case "social":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25";
    case "direct":
      return "bg-muted text-muted-foreground border-border";
    case "campaign":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25";
    case "email":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/25";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

function ReferrerYTick(
  props: Record<string, unknown> & {
    referrerByDomain: Map<string, ReferrerSourceRow>;
  },
) {
  const x = typeof props.x === "number" ? props.x : 0;
  const y = typeof props.y === "number" ? props.y : 0;
  const payload = props.payload as { value?: string } | undefined;
  const domainKey = payload?.value;
  if (!domainKey) return null;
  const row = props.referrerByDomain.get(domainKey);
  if (!row) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-168} y={-14} width={164} height={30} className="overflow-visible">
        <div
          className="flex items-center gap-2 pr-1 text-left text-xs text-foreground"
          style={{ lineHeight: 1.2 }}
        >
          {row.faviconUrl ? (
            <img
              src={row.faviconUrl}
              alt=""
              width={22}
              height={22}
              className="size-[22px] shrink-0 rounded-md border border-border/60 bg-background object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted">
              <Link2 className="size-3.5 text-muted-foreground" aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate font-medium leading-tight">{row.displayLabel}</span>
        </div>
      </foreignObject>
    </g>
  );
}

export function AnalyticsReferrersSection({ rows }: { rows: ReferrerSourceRow[] }) {
  const referrerByDomain = useMemo(() => {
    const m = new Map<string, ReferrerSourceRow>();
    for (const r of rows) m.set(r.domainKey, r);
    return m;
  }, [rows]);

  /** Recharts lists first row at bottom; reverse so #1 source appears at top. */
  const chartData = useMemo(() => [...rows].reverse(), [rows]);

  if (rows.length === 0) {
    return (
      <Card className="app-card border-border/50 shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <MousePointerClick className="h-5 w-5 text-primary" />
            </div>
            Traffic sources
          </CardTitle>
          <CardDescription>Where visitors came from before landing on your site</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-8 pt-2 text-center text-muted-foreground sm:px-6">
          <MousePointerClick className="mx-auto mb-3 h-14 w-14 opacity-25" />
          <p className="text-base font-medium text-foreground">No referrer data yet</p>
          <p className="mt-1 text-sm">
            Referrers appear when the tracker sends <code className="rounded bg-muted px-1">document.referrer</code>{" "}
            (external links and search).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="app-card border-border/50 shadow-sm">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
          </div>
          Traffic sources
        </CardTitle>
        <CardDescription>
          Referrer hostnames (e.g. Google, social networks) and direct visits — share of page views
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 sm:px-6 sm:pb-6">
        <ChartContainer
          config={referrerChartConfig}
          className="aspect-auto h-[min(480px,calc(100vw-3rem))] w-full max-w-full sm:h-[420px]"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 172, right: 12, top: 8, bottom: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted/40" />
            <XAxis
              type="number"
              dataKey="count"
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="domainKey"
              width={12}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={(p) => <ReferrerYTick {...p} referrerByDomain={referrerByDomain} />}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium tabular-nums">{Number(value).toLocaleString()} views</span>
                  )}
                  labelFormatter={(_value, payload) => {
                    const items = payload as Array<{ payload?: ReferrerSourceRow }> | undefined;
                    const row = items?.[0]?.payload;
                    if (!row) return null;
                    return (
                      <span className="flex flex-col gap-0.5">
                        <span>{row.displayLabel}</span>
                        <span className="text-muted-foreground text-xs font-normal">{row.kindLabel}</span>
                      </span>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="count"
              name="Page views"
              fill="var(--color-count)"
              radius={[0, 6, 6, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ChartContainer>

        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <div
              key={r.domainKey}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
            >
              {r.faviconUrl ? (
                <img
                  src={r.faviconUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 shrink-0 rounded-md border border-border/60 bg-background object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
              ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted">
                  <Link2 className="size-3.5 text-muted-foreground" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.displayLabel}</div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="outline" className={cn("text-[10px] font-normal", kindBadgeClass(r.kind))}>
                    {r.kindLabel}
                  </Badge>
                  <span className="tabular-nums">{r.share}%</span>
                  <span>·</span>
                  <span className="tabular-nums">{r.count.toLocaleString()} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
