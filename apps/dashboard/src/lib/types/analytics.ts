export type MetricCount = { key: string; count: number; title?: string }

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
  /** Document title captured with the page view (when provided by the tracker). */
  pageTitle?: string
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

export type LivePagesResponse = {
  websiteId: string
  pages: Record<string, number>
}

export type PageFlowNode = { id: string; sessions: number }
export type PageFlowLink = { source: string; target: string; value: number }
export type PageFlowResponse = {
  nodes: PageFlowNode[]
  links: PageFlowLink[]
  totalTransitions: number
  uniqueSessions: number
}

export type EntryExitPage = { page: string; count: number; title?: string }
export type EntryExitResponse = {
  totalSessions: number
  topEntryPages: EntryExitPage[]
  topExitPages: EntryExitPage[]
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

export type ReferrerTrafficKind =
  | "direct"
  | "search"
  | "social"
  | "email"
  | "campaign"
  | "referral"

export type ReferrerSourceRow = {
  domainKey: string
  displayLabel: string
  kind: ReferrerTrafficKind | string
  kindLabel: string
  count: number
  share: number
  faviconHost: string | null
  faviconUrl: string | null
}

export type ReferrersResponse = {
  referrers: ReferrerSourceRow[]
  totalReferrerEvents: number
}

export type PageStat = {
  page: string
  views: number
  uniqueVisitors: number
  avgDuration: number
  sharePercent: number
  title?: string
}
export type PageStatsResponse = {
  pages: PageStat[]
  totalViews: number
}
