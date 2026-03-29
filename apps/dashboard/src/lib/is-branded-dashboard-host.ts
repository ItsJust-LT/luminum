"use client"

import { useSyncExternalStore } from "react"

function primaryDashboardHostnames(): Set<string> {
  const hosts = new Set(["localhost", "127.0.0.1"])
  try {
    hosts.add(new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname)
  } catch {
    /* ignore */
  }
  return hosts
}

/** True when hostname is not the primary app host (custom branded dashboard). */
export function isBrandedDashboardHostname(hostname: string): boolean {
  const h = hostname.replace(/:\d+$/, "").toLowerCase()
  return !primaryDashboardHostnames().has(h)
}

const noopSubscribe = () => () => {}

export function useIsBrandedDashboardHost(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isBrandedDashboardHostname(typeof window !== "undefined" ? window.location.hostname : ""),
    () => false,
  )
}
