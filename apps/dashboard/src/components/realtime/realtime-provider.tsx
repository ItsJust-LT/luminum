"use client"

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from "react"
import { useSession } from "@/lib/auth/client"

interface OnlineUser {
  userId: string
  name: string
  image?: string
  lastSeenAt?: string
}

interface RealtimeContextType {
  connected: boolean
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
  onMessage: (type: string, handler: (data: any) => void) => () => void
  onlineUsers: Map<string, OnlineUser>
}

const RealtimeContext = createContext<RealtimeContextType>({
  connected: false,
  subscribe: () => {},
  unsubscribe: () => {},
  onMessage: () => () => {},
  onlineUsers: new Map(),
})

export function useRealtime() {
  return useContext(RealtimeContext)
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")

/**
 * WebSocket URL for org-scoped events (mail, forms, WhatsApp fan-out, etc.).
 *
 * - **Default:** If `NEXT_PUBLIC_API_URL` points at another host than the page (e.g. app.* vs api.*),
 *   use **`wss://<page-host>/ws/realtime`** so Better Auth cookies are sent. The edge proxy (see
 *   `deploy/caddy/Caddyfile`) must forward **`/ws/*`** on the dashboard host to Express (:4000).
 * - **Local:** Dashboard and API both on loopback with the same hostname → `ws://host:4000/ws/realtime`.
 * - **Override:** `NEXT_PUBLIC_REALTIME_WS_URL` — in split-host production, set it to the **same**
 *   host as the dashboard (e.g. `wss://app.example.com/ws/realtime`), not `wss://api.*`, or cookies
 *   will not authenticate the upgrade.
 */
function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

function getWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_REALTIME_WS_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  if (typeof window !== "undefined") {
    try {
      if (API_URL && API_URL.length > 0) {
        const apiUrl = new URL(API_URL)
        const pageHost = window.location.hostname
        const apiHost = apiUrl.hostname
        const apiIsLoopback = isLoopbackHost(apiHost)
        const pageIsLoopback = isLoopbackHost(pageHost)
        /** Remote dashboard hitting a dev API URL baked into the build — use same-origin + edge proxy. */
        if (apiIsLoopback && !pageIsLoopback) {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
          return `${protocol}//${window.location.host}/ws/realtime`
        }
        /**
         * Production: dashboard is app.* and API is api.* — session cookies are host-bound, so a WS to
         * api.* would not send them and auth upgrade fails. Use same-origin /ws/realtime (Caddy forwards).
         */
        if (apiHost !== pageHost) {
          if (apiIsLoopback && pageIsLoopback) {
            const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:"
            return `${protocol}//${apiUrl.host}/ws/realtime`
          }
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
          return `${protocol}//${window.location.host}/ws/realtime`
        }
        const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:"
        return `${protocol}//${apiUrl.host}/ws/realtime`
      }
    } catch {
      /* fall through */
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}/ws/realtime`
  }

  try {
    const url = new URL(API_URL || "http://localhost:4000")
    const protocol = url.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${url.host}/ws/realtime`
  } catch {
    return "ws://localhost:4000/ws/realtime"
  }
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectDelay = useRef(1000)
  const handlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const mountedRef = useRef(true)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map())

  const dispatch = useCallback((type: string, data: any) => {
    const handlers = handlersRef.current.get(type)
    if (handlers) {
      for (const handler of handlers) {
        try { handler(data) } catch {}
      }
    }
  }, [])

  const connect = useCallback(() => {
    if (!session?.user?.id || wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

    try {
      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        reconnectDelay.current = 1000

        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "activity:heartbeat" }))
          }
        }, 30_000)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "pong") return

          if (msg.type === "presence:update") {
            setOnlineUsers(prev => {
              const next = new Map(prev)
              if (msg.data?.status === "offline") {
                next.delete(msg.data.userId)
              } else if (msg.data?.userId) {
                next.set(msg.data.userId, {
                  userId: msg.data.userId,
                  name: msg.data.name,
                  image: msg.data.image,
                  lastSeenAt: msg.data.lastSeenAt,
                })
              }
              return next
            })
          }

          if (msg.type === "presence:list" || msg.type === "presence:all") {
            if (Array.isArray(msg.data?.users)) {
              setOnlineUsers(prev => {
                const next = new Map(prev)
                for (const u of msg.data.users) {
                  if (u?.userId) {
                    next.set(u.userId, { userId: u.userId, name: u.name, image: u.image })
                  }
                }
                return next
              })
            }
          }

          dispatch(msg.type, msg.data)
        } catch {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        if (heartbeatTimer.current) { clearInterval(heartbeatTimer.current); heartbeatTimer.current = null }
        scheduleReconnect()
      }

      ws.onerror = () => {
        // onclose will fire after onerror
      }
    } catch {
      scheduleReconnect()
    }
  }, [session, dispatch])

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    reconnectTimer.current = setTimeout(() => {
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000)
      connect()
    }, reconnectDelay.current)
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    if (!isPending && session?.user?.id) {
      connect()
    }
    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [session?.user?.id, isPending, connect])

  const subscribe = useCallback((channel: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "subscribe", channel }))
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "unsubscribe", channel }))
    }
  }, [])

  const onMessage = useCallback((type: string, handler: (data: any) => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set())
    }
    handlersRef.current.get(type)!.add(handler)
    return () => {
      const handlers = handlersRef.current.get(type)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) handlersRef.current.delete(type)
      }
    }
  }, [])

  return (
    <RealtimeContext.Provider value={{ connected, subscribe, unsubscribe, onMessage, onlineUsers }}>
      {children}
    </RealtimeContext.Provider>
  )
}
