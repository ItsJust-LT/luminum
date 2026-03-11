"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { getAvatarForEmail } from "@/lib/actions/avatar"

const CLEARBIT_BASE = "https://logo.clearbit.com"
const FAVICON_BASE = "https://icons.duckduckgo.com/ip3"

// In-memory cache so we only call the server once per email per session (avoids duplicate POSTs on re-mounts)
const avatarCache = new Map<string, { imageUrl: string | null; bimi: string | null; gravatar: string | null }>()

function getDomain(email: string): string | null {
  const at = email.indexOf("@")
  if (at === -1) return null
  return email.slice(at + 1).trim().toLowerCase() || null
}

function getInitials(email: string): string {
  const local = email.split("@")[0] || ""
  const parts = local.split(/[._+-]/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return local.slice(0, 2).toUpperCase() || "?"
}

function getInitialsColor(email: string): string {
  let hash = 0
  const str = email.trim().toLowerCase()
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 52%, 42%)`
}

export interface EmailAvatarProps {
  email: string | null
  /** When provided, skip server lookup and use this URL first (e.g. from notification data). */
  imageUrl?: string | null
  className?: string
  size?: number
}

const avatarSizes: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
}

export function EmailAvatar({ email, imageUrl: initialImageUrl, className, size = 40 }: EmailAvatarProps) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const [serverUrls, setServerUrls] = useState<{
    imageUrl: string | null
    bimi: string | null
    gravatar: string | null
  }>({ imageUrl: null, bimi: null, gravatar: null })
  const requestedRef = useRef<string | null>(null)

  const normalizedEmail = email?.trim() || ""
  const domain = useMemo(() => getDomain(normalizedEmail), [normalizedEmail])
  const pixelSize = typeof size === "string" ? avatarSizes[size] ?? 40 : size

  useEffect(() => {
    if (!normalizedEmail) return
    setSourceIndex(0)
    const cacheKey = normalizedEmail.toLowerCase()
    const cached = avatarCache.get(cacheKey)
    if (cached) {
      setServerUrls(cached)
      return
    }
    if (requestedRef.current === cacheKey) return
    requestedRef.current = cacheKey
    let cancelled = false
    getAvatarForEmail(normalizedEmail)
      .then((result) => {
        if (!cancelled) {
          const urls = {
            imageUrl: result.imageUrl,
            bimi: result.bimi,
            gravatar: result.gravatar,
          }
          avatarCache.set(cacheKey, urls)
          setServerUrls(urls)
          setSourceIndex(0)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) requestedRef.current = null
      })
    return () => {
      cancelled = true
    }
  }, [normalizedEmail])

  const sources = useMemo(() => {
    const list: string[] = []
    if (initialImageUrl) list.push(initialImageUrl)
    if (serverUrls.imageUrl) list.push(serverUrls.imageUrl)
    if (serverUrls.bimi) list.push(serverUrls.bimi)
    if (serverUrls.gravatar) list.push(serverUrls.gravatar)
    if (domain) {
      list.push(`${CLEARBIT_BASE}/${domain}`)
      list.push(`${FAVICON_BASE}/${domain}.ico`)
    }
    return list
  }, [initialImageUrl, serverUrls.imageUrl, serverUrls.bimi, serverUrls.gravatar, domain])

  const currentUrl = sources[sourceIndex]
  const showInitials = !normalizedEmail || sourceIndex >= sources.length

  const handleError = () => {
    setSourceIndex((i) => i + 1)
  }

  if (!normalizedEmail) {
    return (
      <div
        className={cn("rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground font-semibold", className)}
        style={{ width: pixelSize, height: pixelSize, fontSize: Math.max(10, pixelSize * 0.4) }}
      >
        ?
      </div>
    )
  }

  if (showInitials) {
    const bg = getInitialsColor(normalizedEmail)
    const initials = getInitials(normalizedEmail)
    return (
      <div
        className={cn("rounded-full flex items-center justify-center shrink-0 text-white font-semibold antialiased", className)}
        style={{
          width: pixelSize,
          height: pixelSize,
          fontSize: Math.max(10, pixelSize * 0.42),
          backgroundColor: bg,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={currentUrl}
      alt=""
      width={pixelSize}
      height={pixelSize}
      className={cn("rounded-full object-cover shrink-0", className)}
      style={{ width: pixelSize, height: pixelSize }}
      onError={handleError}
    />
  )
}
