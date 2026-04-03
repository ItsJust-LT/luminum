"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { OrganizationEvents } from "@/lib/ably/events"

/**
 * Hook to get live viewer count for a website.
 * Uses the unified WebSocket connection instead of a separate analytics WS.
 * Falls back to the legacy token-based WS if unified WS is not connected.
 */
export function useAnalyticsPresence(websiteId: string | null | undefined) {
  const [liveCount, setLiveCount] = useState(0)
  const [livePages, setLivePages] = useState<Record<string, number>>({})
  const { connected, subscribe, unsubscribe, onMessage } = useRealtime()
  const fallbackWsRef = useRef<WebSocket | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fallbackConnected, setFallbackConnected] = useState(false)

  useEffect(() => {
    if (!websiteId || !connected) return
    subscribe(`analytics:${websiteId}`)
    return () => { unsubscribe(`analytics:${websiteId}`) }
  }, [websiteId, connected, subscribe, unsubscribe])

  useEffect(() => {
    const unsub = onMessage("analytics:live", (data: any) => {
      if (data?.websiteId === websiteId && typeof data?.live === "number") {
        setLiveCount(data.live)
      }
      if (data?.websiteId === websiteId && data?.pages && typeof data.pages === "object") {
        setLivePages(data.pages)
      }
    })
    return unsub
  }, [websiteId, onMessage])

  useEffect(() => {
    if (!websiteId || typeof window === "undefined" || connected) {
      if (fallbackWsRef.current) { fallbackWsRef.current.close(); fallbackWsRef.current = null }
      return
    }

    let cancelled = false
    async function connectFallback() {
      if (cancelled) return
      try {
        const apiBase = typeof process.env.NEXT_PUBLIC_API_URL === "string" ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "") : ""
        const res = await fetch(`${apiBase}/api/analytics/live-ws-token?websiteId=${encodeURIComponent(websiteId!)}`, { credentials: "include" })
        if (!res.ok) return
        const { token, url } = await res.json()
        if (!token || !url) return
        const ws = new WebSocket(`${url}?websiteId=${encodeURIComponent(websiteId!)}&token=${encodeURIComponent(token)}`)
        fallbackWsRef.current = ws
        ws.onopen = () => { if (!cancelled) setFallbackConnected(true) }
        ws.onmessage = (event) => {
          if (cancelled) return
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "live_count" && typeof msg.data?.live === "number") setLiveCount(msg.data.live)
          } catch {}
        }
        ws.onclose = () => {
          if (!cancelled) { setFallbackConnected(false); fallbackTimerRef.current = setTimeout(connectFallback, 3000) }
        }
        ws.onerror = () => { ws.close() }
      } catch {
        if (!cancelled) fallbackTimerRef.current = setTimeout(connectFallback, 3000)
      }
    }
    connectFallback()
    return () => {
      cancelled = true
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
      if (fallbackWsRef.current) { fallbackWsRef.current.close(); fallbackWsRef.current = null }
      setFallbackConnected(false)
    }
  }, [websiteId, connected])

  return { liveCount, livePages, connected: connected || fallbackConnected }
}

/** Org-scoped realtime via unified WS (auto-subscribed to org:&lt;id&gt; on the server). */
export function useOrganizationChannel(
  organizationId: string | null | undefined,
  onEvent: (eventType: string, data: any) => void
) {
  const { connected, onMessage, subscribe } = useRealtime()
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const filterOrg = useCallback(
    (data: any) =>
      data?.organizationId == null || data.organizationId === organizationId,
    [organizationId]
  )

  useEffect(() => {
    if (!organizationId || !connected) return
    subscribe(`org:${organizationId}`)
  }, [organizationId, connected, subscribe])

  useEffect(() => {
    if (!organizationId) return
    const orgId = organizationId
    const fire = (type: string, data: any) => {
      if (data?.organizationId != null && data.organizationId !== orgId) return
      onEventRef.current(type, data)
    }
    const unsubs = [
      onMessage(OrganizationEvents.EMAIL_CREATED, (d) => fire(OrganizationEvents.EMAIL_CREATED, d)),
      onMessage(OrganizationEvents.EMAIL_READ, (d) => fire(OrganizationEvents.EMAIL_READ, d)),
      onMessage(OrganizationEvents.EMAIL_UPDATED, (d) => fire(OrganizationEvents.EMAIL_UPDATED, d)),
      onMessage(OrganizationEvents.EMAIL_DELETED, (d) => fire(OrganizationEvents.EMAIL_DELETED, d)),
      onMessage(OrganizationEvents.FORM_SUBMISSION_CREATED, (d) => {
        if (filterOrg(d)) onEventRef.current(OrganizationEvents.FORM_SUBMISSION_CREATED, d)
      }),
      onMessage(OrganizationEvents.FORM_SUBMISSION_UPDATED, (d) => {
        if (filterOrg(d)) onEventRef.current(OrganizationEvents.FORM_SUBMISSION_UPDATED, d)
      }),
      onMessage(OrganizationEvents.FORM_SUBMISSION_DELETED, (d) => {
        if (filterOrg(d)) onEventRef.current(OrganizationEvents.FORM_SUBMISSION_DELETED, d)
      }),
    ]
    return () => {
      unsubs.forEach((u) => u())
    }
  }, [organizationId, onMessage, filterOrg])

  return { connected, channel: organizationId ? `org:${organizationId}` : null }
}

/**
 * @deprecated Use useRealtime().onMessage("notification", ...) instead
 */
export function useUserNotificationChannel(
  _onNotification: (eventType: string, data: any) => void
) {
  return { connected: false, channel: null }
}

/**
 * @deprecated Use useRealtime() instead
 */
export function useAblyConnection() {
  const { connected } = useRealtime()
  return { connected }
}
