import { NextRequest, NextResponse } from "next/server"
import { copyProxyResponseHeaders } from "@/lib/api-proxy-headers"
import { getInternalApiBaseUrl } from "@/lib/internal-api-url"
const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "")

function rewriteCookies(apiRes: Response): string[] {
  const cookies = apiRes.headers.getSetCookie?.() || []
  return cookies.map((c) =>
    c
      .replace(/;\s*Domain=[^;]*/gi, "")
      .replace(/;\s*SameSite=None/gi, "; SameSite=Lax"),
  )
}

async function proxyAuth(req: NextRequest) {
  const url = new URL(
    req.nextUrl.pathname + req.nextUrl.search,
    getInternalApiBaseUrl(),
  )

  const headers = new Headers(req.headers)
  headers.delete("host")
  headers.set("accept-encoding", "identity")
  headers.set("x-forwarded-host", req.headers.get("host") || "")
  headers.set("origin", APP_ORIGIN)

  const body = ["GET", "HEAD"].includes(req.method)
    ? undefined
    : await req.text()

  const apiRes = await fetch(url, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  })

  const res = new NextResponse(apiRes.body, {
    status: apiRes.status,
    statusText: apiRes.statusText,
  })

  copyProxyResponseHeaders(apiRes.headers, res.headers, { skipSetCookie: true })

  for (const cookie of rewriteCookies(apiRes)) {
    res.headers.append("set-cookie", cookie)
  }

  return res
}

export const GET = proxyAuth
export const POST = proxyAuth
export const PUT = proxyAuth
export const PATCH = proxyAuth
export const DELETE = proxyAuth
