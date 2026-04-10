/**
 * Human-readable chart times in the user's locale — never raw ISO / "Z" strings.
 */

export type ChartTimeGranularity = "hour" | "day" | "month"

export function parseChartTime(value: unknown): Date | null {
  if (value == null || value === "") return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "number") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export function granularityForAnalyticsDateRange(range: string): ChartTimeGranularity {
  if (range === "24h") return "hour"
  if (range === "90d") return "month"
  return "day"
}

/** Inclusive calendar-day span between two local midnights (minimum 1). */
export function customAnalyticsRangeDayCount(from: Date, to: Date): number {
  const a = new Date(from)
  a.setHours(0, 0, 0, 0)
  const b = new Date(to)
  b.setHours(0, 0, 0, 0)
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1)
}

/** Axis/tooltip formatting for charts (includes month bucketing for long ranges). */
export function granularityForAnalytics(
  range: string,
  customFrom?: Date | null,
  customTo?: Date | null
): ChartTimeGranularity {
  if (range === "custom" && customFrom && customTo) {
    const days = customAnalyticsRangeDayCount(customFrom, customTo)
    if (days <= 2) return "hour"
    if (days >= 75) return "month"
    return "day"
  }
  if (range === "custom") return "day"
  return granularityForAnalyticsDateRange(range)
}

/** API timeseries bucket: hour only for very short windows, otherwise day. */
export function timeseriesGranularityForAnalytics(
  range: string,
  customFrom?: Date | null,
  customTo?: Date | null
): "hour" | "day" {
  if (range === "custom" && customFrom && customTo) {
    return customAnalyticsRangeDayCount(customFrom, customTo) <= 2 ? "hour" : "day"
  }
  return range === "24h" ? "hour" : "day"
}

export function formatChartAxisTick(value: unknown, granularity: ChartTimeGranularity): string {
  const d = parseChartTime(value)
  if (!d) return String(value ?? "")
  if (granularity === "hour") {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: d.getMinutes() === 0 ? undefined : "2-digit",
      hour12: true,
    })
  }
  if (granularity === "month") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function formatChartTooltipTime(value: unknown, granularity: ChartTimeGranularity): string {
  const d = parseChartTime(value)
  if (!d) return String(value ?? "")
  if (granularity === "hour") {
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }
  if (granularity === "month") {
    return d.toLocaleDateString(undefined, { weekday: "short", month: "long", year: "numeric" })
  }
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
