import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { absoluteBrandingIconUrls } from "@/lib/branding-icon-url"

const DEFAULT_MANIFEST = {
  id: "/",
  name: "Luminum Agency",
  short_name: "Luminum",
  description: "Agency dashboard — forms, email, billing, and more.",
  start_url: "/",
  display: "standalone",
  display_override: ["standalone", "browser"],
  background_color: "#ffffff",
  theme_color: "#000000",
  orientation: "portrait-primary",
  scope: "/",
  prefer_related_applications: false,
  icons: [
    { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  categories: ["productivity", "utilities"],
  shortcuts: [
    { name: "Organizations", short_name: "Orgs", description: "Pick a workspace", url: "/dashboard", icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }] },
  ],
}

export async function GET() {
  const hdrs = await headers()
  const isCustomDomain = hdrs.get("x-custom-domain") === "true"
  const orgName = hdrs.get("x-org-name")
  const orgLogo = hdrs.get("x-org-logo")
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || ""
  const proto = hdrs.get("x-forwarded-proto") || "https"

  if (isCustomDomain && orgName) {
    const u = absoluteBrandingIconUrls({ host, proto, orgName, orgLogo })
    const icons = [
      { src: u.icon192, sizes: "192x192", type: u.type, purpose: "any" },
      { src: u.icon512, sizes: "512x512", type: u.type, purpose: "any" },
      { src: u.icon192, sizes: "192x192", type: u.type, purpose: "maskable" },
      { src: u.icon512, sizes: "512x512", type: u.type, purpose: "maskable" },
    ]

    const manifest = {
      ...DEFAULT_MANIFEST,
      id: "/",
      name: orgName,
      short_name: orgName,
      description: `${orgName} — workspace dashboard`,
      start_url: "/dashboard",
      icons,
      shortcuts: [
        {
          name: "Home",
          short_name: "Home",
          description: "Workspace home",
          url: "/dashboard",
          icons: [{ src: u.icon192, sizes: "192x192", type: u.type }],
        },
      ],
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
