"use server"

import { serverGet } from "@/lib/api-server"

export type MetricCount = { key: string; count: number }

export type StatsOverview = {
  websiteId: string
  period: string
  pageViews: number
  uniqueSessions: number
  avgDuration: number
  formSubmissions: number
}

export type TimeSeriesPoint = {
  time: string
  pageViews: number
  uniqueSessions: number
  formSubmissions: number
}

export type TimeSeriesResponse = {
  data: TimeSeriesPoint[]
  granularity: string
  totalPeriods: number
  metadata: { totalPageviews: number; totalSessions: number; totalFormSubmissions: number }
}

export type RecentEvent = {
  timestamp: string
  url: string
  country: string
  deviceType: string
}

export type RealtimeResponse = {
  activeVisitors: number
  pageviewsLast30Min: number
  topPages: MetricCount[]
  topCountries: MetricCount[]
  recentEvents: RecentEvent[]
  lastUpdated: string
}

export async function getAnalyticsOverview(
  websiteId: string,
  start: string,
  end: string
): Promise<StatsOverview | null> {
  try {
    return await serverGet("/api/analytics/overview", { websiteId, start, end })
  } catch (e) {
    console.error("[analytics] getAnalyticsOverview", e)
    return null
  }
}

export async function getAnalyticsTimeSeries(
  websiteId: string,
  start: string,
  end: string,
  granularity: "hour" | "day"
): Promise<TimeSeriesResponse | null> {
  try {
    return await serverGet("/api/analytics/timeseries", { websiteId, start, end, granularity })
  } catch (e) {
    console.error("[analytics] getAnalyticsTimeSeries", e)
    return null
  }
}

export async function getAnalyticsTopPages(
  websiteId: string,
  start: string,
  end: string,
  limit: number = 10
): Promise<MetricCount[]> {
  try {
    return await serverGet("/api/analytics/top-pages", { websiteId, start, end, limit })
  } catch (e) {
    console.error("[analytics] getAnalyticsTopPages", e)
    return []
  }
}

export async function getAnalyticsCountries(
  websiteId: string,
  start: string,
  end: string,
  limit: number = 10
): Promise<MetricCount[]> {
  try {
    return await serverGet("/api/analytics/countries", { websiteId, start, end, limit })
  } catch (e) {
    console.error("[analytics] getAnalyticsCountries", e)
    return []
  }
}

export async function getAnalyticsDevices(
  websiteId: string,
  start: string,
  end: string,
  limit: number = 5
): Promise<MetricCount[]> {
  try {
    return await serverGet("/api/analytics/devices", { websiteId, start, end, limit })
  } catch (e) {
    console.error("[analytics] getAnalyticsDevices", e)
    return []
  }
}

export async function getAnalyticsRealtime(websiteId: string): Promise<RealtimeResponse | null> {
  try {
    return await serverGet("/api/analytics/realtime", { websiteId })
  } catch (e) {
    console.error("[analytics] getAnalyticsRealtime", e)
    return null
  }
}
