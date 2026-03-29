import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getInternalApiBaseUrl } from "@/lib/internal-api-url"

/** Session cookie names: default (dev) and __Secure- prefixed (prod HTTPS). */
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
]

const PUBLIC_PATHS = [
  "/sign-in",
  "/install",
  "/accept-invitation",
  "/accept-org-invitation",
  "/accept-owner-invitation",
  /** Must be reachable without a session or PWA install uses the wrong name/icons. */
  "/manifest.json",
  "/sw.js",
]

/** API path prefixes that do not require auth (webhooks, auth). */
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/webhook",
  "/api/images/delete",
  "/api/notifications",
  "/api/proxy",
]

const DOMAIN_LOOKUP_SECRET = process.env.DOMAIN_LOOKUP_SECRET || ""
const PRIMARY_APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "")

const primaryHostnames = (() => {
  const hosts = new Set(["localhost", "127.0.0.1"])
  try {
    hosts.add(new URL(PRIMARY_APP_URL).hostname)
  } catch {}
  return hosts
})()

// ─── Module-level domain-lookup cache (safe: self-hosted Node, not edge) ─────
interface DomainLookupResult {
  organizationId: string
  slug: string
  name: string
  logo: string | null
}
interface CacheEntry {
  data: DomainLookupResult | null
  expiresAt: number
}
const domainCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

async function lookupCustomDomain(
  hostname: string,
): Promise<DomainLookupResult | null> {
  const now = Date.now()
  const cached = domainCache.get(hostname)
  if (cached && cached.expiresAt > now) return cached.data

  try {
    const url = `${getInternalApiBaseUrl()}/api/domain-lookup?domain=${encodeURIComponent(hostname)}`
    const headers: Record<string, string> = {}
    if (DOMAIN_LOOKUP_SECRET)
      headers["x-domain-lookup-secret"] = DOMAIN_LOOKUP_SECRET

    const res = await fetch(url, { headers, cache: "no-store" })
    if (!res.ok) {
      domainCache.set(hostname, { data: null, expiresAt: now + CACHE_TTL_MS })
      return null
    }
    const data = (await res.json()) as DomainLookupResult
    domainCache.set(hostname, { data, expiresAt: now + CACHE_TTL_MS })
    return data
  } catch {
    return null
  }
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  const normalized = pathname.replace(/\/$/, "") || "/"
  if (PUBLIC_PATHS.some((p) => normalized === p || normalized.startsWith(p + "/"))) return true
  return false
}

function isAllowedApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name))
}

function stripHostPort(host: string): string {
  return host.replace(/:\d+$/, "")
}

/** Browsers request these default filenames even when manifest lists other icons. */
function brandedWellKnownPwaPath(pathname: string): number | null {
  const n = pathname.replace(/\/$/, "") || "/"
  if (n === "/android-chrome-192x192.png") return 192
  if (n === "/android-chrome-512x512.png") return 512
  if (n === "/apple-touch-icon.png") return 180
  return null
}

function isAnonymousStaticPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false
  return /\.(png|jpe?g|gif|webp|svg|ico|woff2?|txt|xml|map)$/i.test(pathname)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hostname = stripHostPort(request.headers.get("host") || "localhost")

  // ─── Custom domain handling ──────────────────────────────────────────
  if (!primaryHostnames.has(hostname)) {
    const org = await lookupCustomDomain(hostname)
    if (!org) {
      return NextResponse.redirect(new URL("/", PRIMARY_APP_URL))
    }

    const withOrgContext = () => {
      const h = new Headers(request.headers)
      h.set("x-custom-domain", "true")
      h.set("x-org-slug", org.slug)
      h.set("x-org-name", org.name)
      h.set("x-org-logo", org.logo || "")
      h.set("x-org-id", org.organizationId)
      return h
    }

    /** All /api/* on this host need org context (Route Handlers read x-org-* headers). */
    if (pathname.startsWith("/api/")) {
      return NextResponse.next({
        request: { headers: withOrgContext() },
      })
    }

    // Block admin routes on custom domains
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", PRIMARY_APP_URL))
    }

    const pwaSize = brandedWellKnownPwaPath(pathname)
    if (pwaSize !== null) {
      const rw = new URL(`/api/branding/pwa-icon?size=${pwaSize}`, request.url)
      return NextResponse.rewrite(rw, {
        request: { headers: withOrgContext() },
      })
    }

    if (isAnonymousStaticPath(pathname)) {
      return NextResponse.next()
    }

    // Public paths allowed as-is (with org context)
    if (isPublicPath(pathname)) {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
      return NextResponse.next({
        request: { headers: withOrgContext() },
      })
    }

    // Auth check for protected pages
    if (!hasSessionCookie(request)) {
      const signIn = new URL("/sign-in", request.url)
      signIn.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(signIn)
    }

    // Rewrite flat routes to slug routes
    const rewriteUrl = new URL(`/${org.slug}${pathname}`, request.url)
    rewriteUrl.search = request.nextUrl.search
    return NextResponse.rewrite(rewriteUrl, {
      request: { headers: withOrgContext() },
    })
  }

  // ─── Primary domain: existing behavior ─────────────────────────────

  if (isAnonymousStaticPath(pathname)) {
    return NextResponse.next()
  }

  // Allow public pages
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Allow allowed API routes (auth, webhooks, analytics, Ably, images webhook)
  if (pathname.startsWith("/api/") && isAllowedApi(pathname)) {
    return NextResponse.next()
  }

  // All other /api/ routes are proxied to the Express API via rewrites — allow them through
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Protected page: require session cookie
  if (!hasSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url)
    signIn.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signIn)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image).*)",
  ],
}
