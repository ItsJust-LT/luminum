export const ANALYTICS_DATE_RANGES = [
  { value: "24h", label: "Last 24 hours", hours: 24 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
] as const

export type AnalyticsDateRangeValue = (typeof ANALYTICS_DATE_RANGES)[number]["value"]
