"use client"

// Luminum Analytics TypeScript Client
// Comprehensive client for all analytics features and endpoints
// Host: https://analytics.luminum.agency

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface MetricCount {
  key: string
  count: number
  /** Dominant document title for this URL in the selected period */
  title?: string
}

export interface StatsOverview {
  websiteId: string
  period: string
  pageViews: number
  uniqueSessions: number
  avgDuration: number
  formSubmissions: number
}

export interface TimeSeriesPoint {
  time: string // ISO 8601 date string
  pageViews: number
  uniqueSessions: number
  formSubmissions: number
}

export interface TimeSeriesMetadata {
  totalPageviews: number
  totalSessions: number
  totalFormSubmissions: number
}

export interface TimeSeriesResponse {
  data: TimeSeriesPoint[]
  granularity: string
  totalPeriods: number
  metadata: TimeSeriesMetadata
}

export interface RecentEvent {
  timestamp: string // ISO 8601 date string
  url: string
  pageTitle?: string
  country: string
  deviceType: string
}

export interface RealtimeResponse {
  activeVisitors: number
  pageviewsLast30Min: number
  topPages: MetricCount[]
  topCountries: MetricCount[]
  recentEvents: RecentEvent[]
  lastUpdated: string // ISO 8601 date string
}

export interface CustomEvent {
  id?: string
  websiteId: string
  sessionId: string
  userId?: string
  eventName: string
  eventProperties: Record<string, any>
  url: string
  createdAt?: string
}

export interface EventsResponse {
  events: Array<{
    eventName: string
    count: number
    uniqueUsers: number
  }>
  totalEvents: number
  uniqueUsers: number
}

export interface FilterSuggestions {
  countries: string[]
  deviceTypes: string[]
  referrerDomains: string[]
}

export interface TrackEventResponse {
  eventId: string
  status: string
}

// Form-related interfaces
export interface FormSubmission {
  id: number
  websiteId: string
  submittedAt: string
  data: Record<string, any>
  contacted: boolean
  seen: boolean
}

export interface FormSubmissionResponse {
  submissions: FormSubmission[]
  total: number
  limit: number
  offset: number
}

export interface FormSubmissionRequest {
  websiteId: string
  [key: string]: any // Form fields
}

export interface FormStatusUpdate {
  contacted?: boolean
  seen?: boolean
}

export interface FormStatusResponse {
  status: string
}

// WebSocket types and interfaces
export type WSMessageType = "page_navigation" | "viewer_update" | "live_count" | "form"

export interface WSMessage {
  type: WSMessageType
  data: any
  timestamp: string
}

export interface PageNavigationData {
  eventId: string
  sessionId: string
  url: string
  referrer: string
  deviceType: string
  country: string
  city: string
  screenSize: string
  duration: number
}

export interface ViewerUpdateData {
  eventId: string
  sessionId: string
  url: string
  deviceType: string
  country: string
  city: string
  screenSize: string
  action: "navigate" | "connect" | "disconnect"
  duration?: number
}

export interface LiveDashboardData {
  live: number
}

export interface FormWebSocketData {
  type: "form"
  submittedAt: string
  data: Record<string, any>
}

export interface WebSocketOptions {
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  onLiveUpdate?: (data: LiveDashboardData) => void
  onViewerUpdate?: (data: ViewerUpdateData) => void
  onFormSubmission?: (data: FormWebSocketData) => void
}

// Health and metrics interfaces
export interface HealthResponse {
  status: string
  timestamp: string
  version: string
}

export interface MetricsResponse {
  database: {
    total_connections: number
    idle_connections: number
    acquired_connections: number
    constructing_connections: number
  }
  cache: {
    hit_rate: number
  }
  timestamp: string
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class AnalyticsAPIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
  ) {
    super(message)
    this.name = "AnalyticsAPIError"
  }
}

// ============================================================================
// WEBSOCKET MANAGER CLASS
// ============================================================================

export class WebSocketManager {
  private ws: WebSocket | null = null
  private websiteId: string
  private baseURL: string
  private options: WebSocketOptions
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private isDestroyed = false

  constructor(websiteId: string, baseURL: string, options: WebSocketOptions = {}) {
    this.websiteId = websiteId
    this.baseURL = baseURL
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...options,
    }
  }

  connect(): void {
    if (this.isDestroyed || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.isConnecting = true

    // Convert HTTP URL to WebSocket URL
    const wsURL = this.baseURL.replace("https://", "wss://").replace("http://", "ws://")

    const url = `${wsURL}/ws/live-dashboard?websiteId=${encodeURIComponent(this.websiteId)}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log("[Analytics] WebSocket connected to live dashboard")
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.options.onConnect?.()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case "live_count":
              this.options.onLiveUpdate?.(message.data)
              break
            case "viewer_update":
              this.options.onViewerUpdate?.(message.data)
              break
            case "form":
              this.options.onFormSubmission?.(message.data)
              break
            default:
              console.log("[Analytics] Unknown WebSocket message type:", message.type)
          }
        } catch (error) {
          console.error("[Analytics] Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = (event) => {
        console.log("[Analytics] WebSocket disconnected:", event.code, event.reason)
        this.isConnecting = false
        this.ws = null
        this.options.onDisconnect?.()

        if (!this.isDestroyed && this.shouldReconnect()) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error("[Analytics] WebSocket error:", error)
        this.isConnecting = false
        this.options.onError?.(error)
      }
    } catch (error) {
      console.error("[Analytics] Failed to create WebSocket connection:", error)
      this.isConnecting = false
    }
  }

  disconnect(): void {
    this.isDestroyed = true

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = (this.options.reconnectInterval || 3000) * Math.pow(1.5, this.reconnectAttempts - 1)

    console.log(`[Analytics] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }
}

// ============================================================================
// VIEWER WEBSOCKET MANAGER CLASS
// ============================================================================

export class ViewerWebSocketManager {
  private ws: WebSocket | null = null
  private websiteId: string
  private eventId: string
  private baseURL: string
  private isConnecting = false
  private isDestroyed = false

  constructor(websiteId: string, eventId: string, baseURL: string) {
    this.websiteId = websiteId
    this.eventId = eventId
    this.baseURL = baseURL
  }

  connect(): void {
    if (this.isDestroyed || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.isConnecting = true

    // Convert HTTP URL to WebSocket URL
    const wsURL = this.baseURL.replace("https://", "wss://").replace("http://", "ws://")

    const url = `${wsURL}/ws?websiteId=${encodeURIComponent(this.websiteId)}&eventId=${encodeURIComponent(this.eventId)}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log("[Analytics] Viewer WebSocket connected")
        this.isConnecting = false
      }

      this.ws.onclose = (event) => {
        console.log("[Analytics] Viewer WebSocket disconnected:", event.code, event.reason)
        this.isConnecting = false
        this.ws = null
      }

      this.ws.onerror = (error) => {
        console.error("[Analytics] Viewer WebSocket error:", error)
        this.isConnecting = false
      }
    } catch (error) {
      console.error("[Analytics] Failed to create viewer WebSocket connection:", error)
      this.isConnecting = false
    }
  }

  sendPageNavigation(data: PageNavigationData): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect(): void {
    this.isDestroyed = true

    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

export class AnalyticsClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private wsManager: WebSocketManager | null = null
  private defaultWebsiteId?: string

  constructor(
    baseURL = "https://analytics.luminum.agency",
    options: {
      apiKey?: string
      timeout?: number
      defaultHeaders?: Record<string, string>
      websiteId?: string
    } = {},
  ) {
    this.baseURL = baseURL.replace(/\/$/, "") // Remove trailing slash
    this.defaultWebsiteId = options.websiteId

    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.defaultHeaders,
    }

    // Add API key if provided
    if (options.apiKey) {
      this.defaultHeaders["Authorization"] = `Bearer ${options.apiKey}`
    }
  }

  // ============================================================================
  // WEBSITE ID MANAGEMENT
  // ============================================================================

  setDefaultWebsiteId(websiteId: string): void {
    this.defaultWebsiteId = websiteId
  }

  getDefaultWebsiteId(): string | undefined {
    return this.defaultWebsiteId
  }

  private resolveWebsiteId(websiteId?: string): string {
    const resolvedId = websiteId || this.defaultWebsiteId
    if (!resolvedId) {
      throw new Error("Website ID is required. Either provide it as a parameter or set a default using setDefaultWebsiteId()")
    }
    return resolvedId
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseURL}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string
      params?: Record<string, any>
      body?: any
      headers?: Record<string, string>
    } = {},
  ): Promise<T> {
    const { method = "GET", params, body, headers = {} } = options

    const url = this.buildURL(endpoint, method === "GET" ? params : undefined)

    const requestHeaders = { ...this.defaultHeaders, ...headers }

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
    }

    if (body && method !== "GET") {
      requestInit.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, requestInit)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorData = await response.json() as { message?: string }
          if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch {
          // If error response isn't JSON, use status text
        }

        throw new AnalyticsAPIError(response.status, response.statusText, errorMessage)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      if (error instanceof AnalyticsAPIError) {
        throw error
      }

      // Network or other errors
      throw new AnalyticsAPIError(0, "Network Error", error instanceof Error ? error.message : "Unknown error")
    }
  }

  // ============================================================================
  // CORE ANALYTICS METHODS
  // ============================================================================

  /**
   * Get overview statistics for a website
   */
  async getOverview(params: Omit<BaseParams, 'websiteId'> & FilterParams & { websiteId?: string }): Promise<StatsOverview> {
    const websiteId = this.resolveWebsiteId(params.websiteId)
    return this.request<StatsOverview>("/api/v1/overview", { 
      params: { ...params, websiteId } 
    })
  }

  /**
   * Get time series data for page views, sessions, and form submissions
   */
  async getTimeSeries(params: Omit<TimeSeriesParams, 'websiteId'> & { websiteId?: string }): Promise<TimeSeriesResponse> {
    const websiteId = this.resolveWebsiteId(params.websiteId)
    return this.request<TimeSeriesResponse>("/api/v1/timeseries", { 
      params: { ...params, websiteId } 
    })
  }

  /**
   * Get realtime analytics data
   */
  async getRealtime(websiteId?: string): Promise<RealtimeResponse> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    return this.request<RealtimeResponse>("/api/v1/realtime", {
      params: { websiteId: resolvedWebsiteId },
    })
  }

  /**
   * Get top pages data
   */
  async getTopPages(params: Omit<BaseParams, 'websiteId'> & FilterParams & { websiteId?: string }): Promise<MetricCount[]> {
    const websiteId = this.resolveWebsiteId(params.websiteId)
    return this.request<MetricCount[]>("/api/v1/top-pages", { 
      params: { ...params, websiteId } 
    })
  }

  /**
   * Get country breakdown data
   */
  async getCountries(params: Omit<BaseParams, 'websiteId'> & FilterParams & { websiteId?: string }): Promise<MetricCount[]> {
    const websiteId = this.resolveWebsiteId(params.websiteId)
    return this.request<MetricCount[]>("/api/v1/countries", { 
      params: { ...params, websiteId } 
    })
  }

  /**
   * Get device breakdown data
   */
  async getDevices(params: Omit<BaseParams, 'websiteId'> & FilterParams & { websiteId?: string }): Promise<MetricCount[]> {
    const websiteId = this.resolveWebsiteId(params.websiteId)
    return this.request<MetricCount[]>("/api/v1/devices", { 
      params: { ...params, websiteId } 
    })
  }

  // ============================================================================
  // CUSTOM EVENTS METHODS
  // ============================================================================

  /**
   * Track a custom event
   */
  async trackEvent(event: Omit<CustomEvent, 'websiteId'> & { websiteId?: string }): Promise<TrackEventResponse> {
    const websiteId = this.resolveWebsiteId(event.websiteId)
    return this.request<TrackEventResponse>("/api/v1/events", {
      method: "POST",
      body: { ...event, websiteId },
    })
  }

  /**
   * Get custom events data
   */
  async getEvents(params: Omit<EventsParams, 'websiteId'> & { websiteId?: string }): Promise<EventsResponse> {
    const websiteId = this.resolveWebsiteId(params.websiteId)
    return this.request<EventsResponse>("/api/v1/events", { 
      params: { ...params, websiteId } 
    })
  }

  // ============================================================================
  // FORM METHODS
  // ============================================================================

  /**
   * Submit form data
   */
  async submitForm(formData: FormSubmissionRequest): Promise<{ status: string }> {
    return this.request<{ status: string }>("/form", {
      method: "POST",
      body: formData,
    })
  }

  /**
   * List form submissions with filtering
   */
  async getFormSubmissions(params: {
    websiteId?: string
    limit?: number
    offset?: number
    contacted?: boolean
    seen?: boolean
    start?: string
    end?: string
  }): Promise<FormSubmissionResponse> {
    const websiteId = this.resolveWebsiteId(params.websiteId)
    const { websiteId: _, ...queryParams } = params
    return this.request<FormSubmissionResponse>("/forms", {
      params: { ...queryParams, websiteId },
    })
  }

  /**
   * Update form submission status (contacted/seen)
   */
  async updateFormStatus(formId: string, status: FormStatusUpdate): Promise<FormStatusResponse> {
    return this.request<FormStatusResponse>("/form/status", {
      method: "PUT",
      params: { id: formId },
      body: status,
    })
  }

  // ============================================================================
  // TRACKING METHODS
  // ============================================================================

  /**
   * Track a page view (direct endpoint)
   */
  async trackPageView(event: {
    websiteId?: string
    sessionId: string
    url: string
    referrer?: string
    screenSize?: string
    userAgent?: string
    pageTitle?: string
    [key: string]: any
  }): Promise<{ status: string }> {
    const websiteId = this.resolveWebsiteId(event.websiteId)
    return this.request<{ status: string }>("/track", {
      method: "POST",
      body: { ...event, websiteId },
    })
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get filter suggestions for advanced filtering
   */
  async getFilterSuggestions(websiteId?: string): Promise<FilterSuggestions> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    return this.request<FilterSuggestions>("/api/v1/filter-suggestions", {
      params: { websiteId: resolvedWebsiteId },
    })
  }

  /**
   * Get live viewer count
   */
  async getLiveViewerCount(websiteId?: string): Promise<{ live: number }> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    return this.request<{ live: number }>("/stats/live", {
      params: { websiteId: resolvedWebsiteId },
    })
  }

  /**
   * Health check
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health")
  }

  /**
   * Get server metrics
   */
  async getMetrics(): Promise<MetricsResponse> {
    return this.request<MetricsResponse>("/metrics")
  }

  // ============================================================================
  // WEBSOCKET METHODS
  // ============================================================================

  /**
   * Connect to live dashboard WebSocket for real-time updates
   */
  connectLiveDashboard(websiteId?: string, options: WebSocketOptions = {}): WebSocketManager {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    
    // Disconnect existing connection if any
    if (this.wsManager) {
      this.wsManager.disconnect()
    }

    this.wsManager = new WebSocketManager(resolvedWebsiteId, this.baseURL, options)
    this.wsManager.connect()

    return this.wsManager
  }

  /**
   * Disconnect from live dashboard WebSocket
   */
  disconnectLiveDashboard(): void {
    if (this.wsManager) {
      this.wsManager.disconnect()
      this.wsManager = null
    }
  }

  /**
   * Check if live dashboard WebSocket is connected
   */
  isLiveDashboardConnected(): boolean {
    return this.wsManager?.isConnected() || false
  }

  /**
   * Get current WebSocket manager instance
   */
  getLiveDashboardManager(): WebSocketManager | null {
    return this.wsManager
  }

  /**
   * Create a viewer WebSocket connection for tracking page navigation
   */
  createViewerConnection(websiteId: string, eventId: string): ViewerWebSocketManager {
    return new ViewerWebSocketManager(websiteId, eventId, this.baseURL)
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Get analytics data for the last 24 hours
   */
  async getToday(websiteId?: string): Promise<StatsOverview> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const end = new Date()
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)

    return this.getOverview({
      websiteId: resolvedWebsiteId,
      start: start.toISOString(),
      end: end.toISOString(),
    })
  }

  /**
   * Get analytics data for the last 7 days
   */
  async getLastWeek(websiteId?: string): Promise<StatsOverview> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

    return this.getOverview({
      websiteId: resolvedWebsiteId,
      start: start.toISOString(),
      end: end.toISOString(),
    })
  }

  /**
   * Get analytics data for the last 30 days
   */
  async getLastMonth(websiteId?: string): Promise<StatsOverview> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const end = new Date()
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    return this.getOverview({
      websiteId: resolvedWebsiteId,
      start: start.toISOString(),
      end: end.toISOString(),
    })
  }

  /**
   * Get hourly time series data for the last 24 hours
   */
  async getTodayTimeSeries(websiteId?: string): Promise<TimeSeriesResponse> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const end = new Date()
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)

    return this.getTimeSeries({
      websiteId: resolvedWebsiteId,
      start: start.toISOString(),
      end: end.toISOString(),
      granularity: "hour",
    })
  }

  /**
   * Get daily time series data for the last 30 days
   */
  async getMonthlyTimeSeries(websiteId?: string): Promise<TimeSeriesResponse> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const end = new Date()
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    return this.getTimeSeries({
      websiteId: resolvedWebsiteId,
      start: start.toISOString(),
      end: end.toISOString(),
      granularity: "day",
    })
  }

  /**
   * Get top pages for the last 7 days
   */
  async getTopPagesWeek(websiteId?: string, limit = 10): Promise<MetricCount[]> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

    return this.getTopPages({
      websiteId: resolvedWebsiteId,
      start: start.toISOString(),
      end: end.toISOString(),
      limit,
    })
  }

  /**
   * Get country breakdown for the last 7 days
   */
  async getCountriesWeek(websiteId?: string, limit = 10): Promise<MetricCount[]> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

    return this.getCountries({
      websiteId: resolvedWebsiteId,
      start: start.toISOString(),
      end: end.toISOString(),
      limit,
    })
  }

  /**
   * Track a custom conversion event
   */
  async trackConversion(
    sessionId: string,
    url: string,
    conversionType: string,
    value?: number,
    properties: Record<string, any> = {},
    websiteId?: string,
  ): Promise<TrackEventResponse> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    return this.trackEvent({
      websiteId: resolvedWebsiteId,
      sessionId,
      eventName: "conversion",
      url,
      eventProperties: {
        conversionType,
        value,
        ...properties,
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Get comprehensive dashboard data (combines multiple endpoints)
   */
  async getDashboardData(websiteId?: string): Promise<{
    overview: StatsOverview
    timeSeries: TimeSeriesResponse
    topPages: MetricCount[]
    topCountries: MetricCount[]
    realtime: RealtimeResponse
    formSubmissions: FormSubmissionResponse
  }> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const [overview, timeSeries, topPages, topCountries, realtime, formSubmissions] = await Promise.all([
      this.getLastWeek(resolvedWebsiteId),
      this.getMonthlyTimeSeries(resolvedWebsiteId),
      this.getTopPagesWeek(resolvedWebsiteId, 5),
      this.getCountriesWeek(resolvedWebsiteId, 5),
      this.getRealtime(resolvedWebsiteId),
      this.getFormSubmissions({ websiteId: resolvedWebsiteId, limit: 10 }),
    ])

    return {
      overview,
      timeSeries,
      topPages,
      topCountries,
      realtime,
      formSubmissions,
    }
  }

  /**
   * Enhanced dashboard data with live WebSocket connection
   */
  async getDashboardDataWithLive(
    websiteId?: string,
    onLiveUpdate?: (data: LiveDashboardData) => void,
    onViewerUpdate?: (data: ViewerUpdateData) => void,
    onFormSubmission?: (data: FormWebSocketData) => void,
  ): Promise<{
    overview: StatsOverview
    timeSeries: TimeSeriesResponse
    topPages: MetricCount[]
    topCountries: MetricCount[]
    realtime: RealtimeResponse
    formSubmissions: FormSubmissionResponse
    liveConnection: WebSocketManager
  }> {
    const resolvedWebsiteId = this.resolveWebsiteId(websiteId)
    const [overview, timeSeries, topPages, topCountries, realtime, formSubmissions] = await Promise.all([
      this.getLastWeek(resolvedWebsiteId),
      this.getMonthlyTimeSeries(resolvedWebsiteId),
      this.getTopPagesWeek(resolvedWebsiteId, 5),
      this.getCountriesWeek(resolvedWebsiteId, 5),
      this.getRealtime(resolvedWebsiteId),
      this.getFormSubmissions({ websiteId: resolvedWebsiteId, limit: 10 }),
    ])

    const liveConnection = this.connectLiveDashboard(resolvedWebsiteId, {
      onLiveUpdate,
      onViewerUpdate,
      onFormSubmission,
      onConnect: () => console.log("[Analytics] Live dashboard connected"),
      onDisconnect: () => console.log("[Analytics] Live dashboard disconnected"),
      onError: (error) => console.error("[Analytics] Live dashboard error:", error),
    })

    return {
      overview,
      timeSeries,
      topPages,
      topCountries,
      realtime,
      formSubmissions,
      liveConnection,
    }
  }
}

// ============================================================================
// REQUEST PARAMETER INTERFACES
// ============================================================================

export interface BaseParams {
  websiteId: string
  start?: string // ISO 8601 date string
  end?: string // ISO 8601 date string
  limit?: number
  offset?: number
}

export interface FilterParams {
  url?: string
  country?: string
  deviceType?: string
  referrer?: string
  sessionId?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  city?: string
  browserName?: string
  osName?: string
  trafficSource?: string
  referrerDomain?: string
}

export interface TimeSeriesParams extends BaseParams, FilterParams {
  granularity?: "hour" | "day"
  metrics?: string
}

export interface EventsParams {
  websiteId: string
  start?: string
  end?: string
  eventName?: string
  groupBy?: string
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

const ANALYTICS_URL = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_ANALYTICS_URL || "https://analytics.luminum.agency")
  : (process.env.NEXT_PUBLIC_ANALYTICS_URL || "https://analytics.luminum.agency")

export const analytics = new AnalyticsClient(ANALYTICS_URL)

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Basic usage with default website ID
const client = new AnalyticsClient('https://analytics.luminum.agency', {
  websiteId: 'your-website-id'
});

// Get overview data
const overview = await client.getOverview({
  start: '2023-01-01T00:00:00Z',
  end: '2023-01-31T23:59:59Z'
});

// Track custom events
await client.trackEvent({
  sessionId: 'session_123',
  eventName: 'button_click',
  url: '/homepage',
  eventProperties: { buttonId: 'cta-hero' }
});

// Submit form data
await client.submitForm({
  websiteId: 'your-website-id',
  name: 'John Doe',
  email: 'john@example.com',
  message: 'Hello world'
});

// Get form submissions
const forms = await client.getFormSubmissions({
  limit: 10,
  contacted: false
});

// Update form status
await client.updateFormStatus('123', {
  contacted: true,
  seen: true
});

// Connect to live dashboard
const liveConnection = client.connectLiveDashboard('your-website-id', {
  onLiveUpdate: (data) => console.log('Live visitors:', data.live),
  onViewerUpdate: (data) => console.log('Viewer update:', data),
  onFormSubmission: (data) => console.log('New form submission:', data)
});

// Create viewer connection for page tracking
const viewerConnection = client.createViewerConnection('your-website-id', 'event_123');
viewerConnection.connect();

// Send page navigation updates
viewerConnection.sendPageNavigation({
  eventId: 'event_123',
  sessionId: 'session_456',
  url: '/new-page',
  referrer: '/old-page',
  deviceType: 'desktop',
  country: 'US',
  city: 'New York',
  screenSize: '1920x1080',
  duration: 45
});

// Get comprehensive dashboard data
const dashboardData = await client.getDashboardDataWithLive('your-website-id', 
  (liveData) => console.log('Live count:', liveData.live),
  (viewerData) => console.log('Viewer action:', viewerData.action),
  (formData) => console.log('New form:', formData.data)
);

// Health check
const health = await client.getHealth();
console.log('Server status:', health.status);

// Get server metrics
const metrics = await client.getMetrics();
console.log('Database connections:', metrics.database.total_connections);
*/
