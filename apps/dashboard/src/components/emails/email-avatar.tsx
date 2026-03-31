"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  displayNameForOrgBrand,
  extractEmailFromFromHeader,
  getPublicApiBase,
} from "@/lib/email-from-header"

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
  /** Stored Gravatar URL from webhook / database (preferred). */
  senderAvatarUrl?: string | null
  className?: string
  size?: number
}

export function EmailAvatar({
  email,
  imageUrl: initialImageUrl,
  senderAvatarUrl,
  className,
  size = 40,
}: EmailAvatarProps) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const normalizedEmail = email?.trim() || ""
  const parsedAddr = useMemo(() => {
    if (!normalizedEmail) return ""
    try {
      return extractEmailFromFromHeader(normalizedEmail).toLowerCase()
    } catch {
      return normalizedEmail.toLowerCase()
    }
  }, [normalizedEmail])

  const brandLabel = useMemo(() => displayNameForOrgBrand(normalizedEmail), [normalizedEmail])
  const apiBase = useMemo(() => getPublicApiBase(), [])

  const sources = useMemo(() => {
    const list: string[] = []
    if (initialImageUrl) list.push(initialImageUrl)
    if (senderAvatarUrl) list.push(senderAvatarUrl)
    if (parsedAddr && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedAddr)) {
      list.push(`/api/email-gravatar?email=${encodeURIComponent(parsedAddr)}`)
    }
    if (apiBase && brandLabel) {
      list.push(`${apiBase}/api/public/org-brand?name=${encodeURIComponent(brandLabel)}`)
    }
    return list
  }, [initialImageUrl, senderAvatarUrl, parsedAddr, apiBase, brandLabel])

  const pixelSize = size
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
    const bg = getInitialsColor(parsedAddr || normalizedEmail)
    const initials = getInitials(parsedAddr || normalizedEmail)
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
