import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

const DEFAULT_MANIFEST = {
  name: "Luminum Agency",
  short_name: "Luminum Agency",
  description: "A Progressive Web App built with Next.js",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#000000",
  orientation: "portrait",
  scope: "/",
  icons: [
    { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  ],
  categories: ["productivity", "utilities"],
}

export async function GET() {
  const hdrs = await headers()
  const isCustomDomain = hdrs.get("x-custom-domain") === "true"
  const orgName = hdrs.get("x-org-name")
  const orgLogo = hdrs.get("x-org-logo")

  if (isCustomDomain && orgName) {
    const fallbackIcon = `/api/proxy/api/public/org-brand?name=${encodeURIComponent(orgName)}`
    const icons = orgLogo
      ? [
          { src: orgLogo, sizes: "192x192", type: "image/png" },
          { src: orgLogo, sizes: "512x512", type: "image/png" },
        ]
      : [
          { src: fallbackIcon, sizes: "192x192", type: "image/svg+xml" },
          { src: fallbackIcon, sizes: "512x512", type: "image/svg+xml" },
        ]

    const manifest = {
      ...DEFAULT_MANIFEST,
      name: orgName,
      short_name: orgName,
      description: `${orgName} Dashboard`,
      start_url: "/dashboard",
      icons,
    }

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    })
  }

  return NextResponse.json(DEFAULT_MANIFEST, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
