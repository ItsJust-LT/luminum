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

export type LivePagesResponse = {
  websiteId: string
  pages: Record<string, number>
}

export async function getAnalyticsLivePages(websiteId: string): Promise<LivePagesResponse | null> {
  try {
    return await serverGet("/api/analytics/live-pages", { websiteId })
  } catch (e) {
    console.error("[analytics] getAnalyticsLivePages", e)
    return null
  }
}

export type PageFlowNode = { id: string; sessions: number }
export type PageFlowLink = { source: string; target: string; value: number }
export type PageFlowResponse = {
  nodes: PageFlowNode[]
  links: PageFlowLink[]
  totalTransitions: number
  uniqueSessions: number
}

export async function getAnalyticsPageFlow(
  websiteId: string,
  start: string,
  end: string,
  limit: number = 50
): Promise<PageFlowResponse | null> {
  try {
    return await serverGet("/api/analytics/page-flow", { websiteId, start, end, limit })
  } catch (e) {
    console.error("[analytics] getAnalyticsPageFlow", e)
    return null
  }
}

export type EntryExitPage = { page: string; count: number }
export type EntryExitResponse = {
  totalSessions: number
  topEntryPages: EntryExitPage[]
  topExitPages: EntryExitPage[]
}

export async function getAnalyticsEntryExit(
  websiteId: string,
  start: string,
  end: string,
  limit: number = 10
): Promise<EntryExitResponse | null> {
  try {
    return await serverGet("/api/analytics/top-entry-exit", { websiteId, start, end, limit })
  } catch (e) {
    console.error("[analytics] getAnalyticsEntryExit", e)
    return null
  }
}

export type SessionPath = {
  path: string
  pages: string[]
  count: number
  depth: number
}
export type SessionPathsResponse = {
  paths: SessionPath[]
  totalSessions: number
  avgPagesPerSession: number
}

export async function getAnalyticsSessionPaths(
  websiteId: string,
  start: string,
  end: string,
  limit: number = 20
): Promise<SessionPathsResponse | null> {
  try {
    return await serverGet("/api/analytics/session-paths", { websiteId, start, end, limit })
  } catch (e) {
    console.error("[analytics] getAnalyticsSessionPaths", e)
    return null
  }
}

export type PageStat = {
  page: string
  views: number
  uniqueVisitors: number
  avgDuration: number
  sharePercent: number
}
export type PageStatsResponse = {
  pages: PageStat[]
  totalViews: number
}

export async function getAnalyticsPageStats(
  websiteId: string,
  start: string,
  end: string,
  limit: number = 20
): Promise<PageStatsResponse | null> {
  try {
    return await serverGet("/api/analytics/page-stats", { websiteId, start, end, limit })
  } catch (e) {
    console.error("[analytics] getAnalyticsPageStats", e)
    return null
  }
}
