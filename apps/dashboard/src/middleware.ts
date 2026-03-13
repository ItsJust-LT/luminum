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
]

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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

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
