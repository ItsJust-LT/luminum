import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { absoluteBrandingIconUrl } from "@/lib/branding-icon-url"

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
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || ""
  const proto = hdrs.get("x-forwarded-proto") || "https"

  if (isCustomDomain && orgName) {
    const { url, type } = absoluteBrandingIconUrl({ host, proto, orgName, orgLogo })
    const icons = [
      { src: url, sizes: "192x192", type, purpose: "any" },
      { src: url, sizes: "512x512", type, purpose: "any" },
      { src: url, sizes: "192x192", type, purpose: "maskable" },
      { src: url, sizes: "512x512", type, purpose: "maskable" },
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
        "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
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
