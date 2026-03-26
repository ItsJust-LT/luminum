import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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
]

/** API path prefixes that do not require auth (webhooks, auth). */
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/webhook",
  "/api/images/delete",
  "/api/notifications",
  "/api/proxy",
]

const API_URL = process.env.API_URL || "http://localhost:4000"
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
    const url = `${API_URL}/api/domain-lookup?domain=${encodeURIComponent(hostname)}`
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hostname = stripHostPort(request.headers.get("host") || "localhost")

  // ─── Custom domain handling ──────────────────────────────────────────
  if (!primaryHostnames.has(hostname)) {
    // Allow API routes through (auth proxy, data proxy, etc.)
    if (pathname.startsWith("/api/")) {
      return NextResponse.next()
    }

    const org = await lookupCustomDomain(hostname)
    if (!org) {
      return NextResponse.redirect(new URL("/", PRIMARY_APP_URL))
    }

    // Block admin routes on custom domains
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", PRIMARY_APP_URL))
    }

    // Set org context headers for downstream pages/routes
    const setOrgHeaders = (response: NextResponse) => {
      response.headers.set("x-custom-domain", "true")
      response.headers.set("x-org-slug", org.slug)
      response.headers.set("x-org-name", org.name)
      response.headers.set("x-org-logo", org.logo || "")
      response.headers.set("x-org-id", org.organizationId)
      return response
    }

    // Public paths allowed as-is (with org context)
    if (isPublicPath(pathname)) {
      if (pathname === "/") {
        const res = NextResponse.redirect(
          new URL("/dashboard", request.url),
        )
        return setOrgHeaders(res)
      }
      const res = NextResponse.next({
        request: {
          headers: new Headers(request.headers),
        },
      })
      return setOrgHeaders(res)
    }

    // Auth check for protected pages
    if (!hasSessionCookie(request)) {
      const signIn = new URL("/sign-in", request.url)
      signIn.searchParams.set("callbackUrl", pathname)
      const res = NextResponse.redirect(signIn)
      return setOrgHeaders(res)
    }

    // Rewrite flat routes to slug routes
    const rewriteUrl = new URL(`/${org.slug}${pathname}`, request.url)
    rewriteUrl.search = request.nextUrl.search
    const res = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: new Headers(request.headers),
      },
    })
    return setOrgHeaders(res)
  }

  // ─── Primary domain: existing behavior ─────────────────────────────

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
    /*
     * Match all paths except static files and _next.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-touch-icon|.*\\.png$|.*\\.ico$|.*\\.svg$).*)",
  ],
}
