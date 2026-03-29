import { NextRequest, NextResponse } from "next/server"
import { ImageResponse } from "next/og"
import { headers } from "next/headers"
import {
  hueFromString,
  initialsFromOrgName,
  isRasterImageUrl,
  isSvgImageUrl,
} from "@/lib/org-brand-initials"

function clampSize(raw: string | null): number {
  const n = parseInt(raw || "192", 10)
  if (Number.isNaN(n)) return 192
  return Math.min(512, Math.max(64, n))
}

export async function GET(request: NextRequest) {
  const size = clampSize(request.nextUrl.searchParams.get("size"))
  const hdrs = await headers()
  const isCustom = hdrs.get("x-custom-domain") === "true"
  const orgName = hdrs.get("x-org-name")
  const orgLogo = hdrs.get("x-org-logo")?.trim()

  const fallbackStatic = (s: number) => {
    const u = request.nextUrl.clone()
    u.pathname = s >= 384 ? "/android-chrome-512x512.png" : "/android-chrome-192x192.png"
    u.search = ""
    return NextResponse.redirect(u.toString(), 302)
  }

  if (!isCustom || !orgName) {
    return fallbackStatic(size)
  }

  if (orgLogo && isRasterImageUrl(orgLogo)) {
    const target =
      orgLogo.startsWith("http://") || orgLogo.startsWith("https://")
        ? orgLogo
        : new URL(orgLogo, request.url).toString()
    return NextResponse.redirect(target, 302)
  }
  if (orgLogo && !isSvgImageUrl(orgLogo)) {
    const target =
      orgLogo.startsWith("http://") || orgLogo.startsWith("https://")
        ? orgLogo
        : new URL(orgLogo, request.url).toString()
    return NextResponse.redirect(target, 302)
  }

  const initials = initialsFromOrgName(orgName)
  const hue = hueFromString(orgName)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `hsl(${hue} 45% 40%)`,
          borderRadius: size * 0.22,
          color: "white",
          fontSize: Math.round(size * 0.36),
          fontWeight: 600,
          fontFamily:
            "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
        }}
      >
        {initials}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  )
}
