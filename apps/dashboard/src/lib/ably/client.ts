"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Hook to get live viewer count for a website.
 * Connects to the Express API WebSocket (which receives updates from the Go
 * analytics service). Go tracks realtime viewers on client sites and pushes
 * counts to Express; the dashboard subscribes via Express WS.
 */
export function useAnalyticsPresence(websiteId: string | null | undefined) {
  const [liveCount, setLiveCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!websiteId || typeof window === "undefined") {
      setLiveCount(0)
      setConnected(false)
      return
    }

    let cancelled = false

    async function connect() {
      if (cancelled) return

      try {
        const apiBase = typeof process.env.NEXT_PUBLIC_API_URL === "string" ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "") : ""
        const res = await fetch(
          `${apiBase}/api/analytics/live-ws-token?websiteId=${encodeURIComponent(websiteId!)}`,
          { credentials: "include" }
        )
        if (!res.ok) return
        const { token, url } = await res.json()
        if (!token || !url) return

        const wsUrl = `${url}?websiteId=${encodeURIComponent(websiteId!)}&token=${encodeURIComponent(token)}`
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!cancelled) setConnected(true)
        }

        ws.onmessage = (event) => {
          if (cancelled) return
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "live_count" && typeof msg.data?.live === "number") {
              setLiveCount(msg.data.live)
            }
          } catch {}
        }

        ws.onclose = () => {
          if (!cancelled) {
            setConnected(false)
            reconnectTimerRef.current = setTimeout(connect, 3000)
          }
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch {
        if (!cancelled) {
          reconnectTimerRef.current = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setLiveCount(0)
      setConnected(false)
    }
  }, [websiteId])

  return { liveCount, connected }
}

/**
 * No-op replacement for useOrganizationChannel.
 * Real-time organization events (emails, forms) are no longer pushed via Ably.
 * Components should poll or refetch on user action instead.
 */
export function useOrganizationChannel(
  _organizationId: string | null | undefined,
  _onEvent: (eventType: string, data: any) => void
) {
  return { connected: false, channel: null }
}

/**
 * No-op replacement for useUserNotificationChannel.
 * User notifications now rely on polling instead of real-time push.
 */
export function useUserNotificationChannel(
  _onNotification: (eventType: string, data: any) => void
) {
  return { connected: false, channel: null }
}

/**
 * No-op replacement for useAblyConnection.
 */
export function useAblyConnection() {
  return { connected: false }
}
