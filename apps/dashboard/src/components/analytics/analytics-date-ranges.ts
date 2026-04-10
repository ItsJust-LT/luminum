export const ANALYTICS_DATE_RANGES = [
  { value: "24h", label: "Last 24 hours", shortLabel: "24h", hours: 24 },
  { value: "7d", label: "Last 7 days", shortLabel: "7d", days: 7 },
  { value: "30d", label: "Last 30 days", shortLabel: "30d", days: 30 },
  { value: "90d", label: "Last 90 days", shortLabel: "90d", days: 90 },
] as const

export type AnalyticsPresetRange = (typeof ANALYTICS_DATE_RANGES)[number]["value"]

/** Preset key or custom calendar range (see org analytics date controls). */
export type AnalyticsDateRangeValue = AnalyticsPresetRange | "custom"

/** Rolling window bounds for preset ranges (matches legacy dashboard semantics). */
export function getAnalyticsPresetBounds(range: AnalyticsPresetRange): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  const selected = ANALYTICS_DATE_RANGES.find((r) => r.value === range)
  if (!selected) return { start, end }
  if ("hours" in selected) {
    start.setHours(end.getHours() - selected.hours)
  } else if ("days" in selected) {
    start.setDate(end.getDate() - selected.days)
  }
  return { start, end }
}
