import { NextRequest, NextResponse } from "next/server"
import { copyProxyResponseHeaders } from "@/lib/api-proxy-headers"
import { getInternalApiBaseUrl } from "@/lib/internal-api-url"

async function proxyData(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/").slice(3) // strip ["", "api", "proxy"]
  const path = "/" + segments.join("/")
  if (path === "/api/avatar" || path.startsWith("/api/avatar/")) {
    return NextResponse.json(
      {
        error:
          "The avatar endpoint is not available through this proxy. Gravatar URLs are stored on each email when it arrives; the dashboard resolves avatars without proxying this path.",
      },
      { status: 410 }
    )
  }
  const url = new URL(path + req.nextUrl.search, getInternalApiBaseUrl())

  const headers = new Headers(req.headers)
  headers.delete("host")
  // Avoid gzip on API → Node fetch decompresses body but may keep Content-Encoding; browser then fails to decode.
  headers.set("accept-encoding", "identity")

  const body = ["GET", "HEAD"].includes(req.method)
    ? undefined
    : await req.text()

  const apiRes = await fetch(url, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  })

  const outHeaders = new Headers()
  copyProxyResponseHeaders(apiRes.headers, outHeaders)

  return new NextResponse(apiRes.body, {
    status: apiRes.status,
    statusText: apiRes.statusText,
    headers: outHeaders,
  })
}

export const GET = proxyData
export const POST = proxyData
export const PUT = proxyData
export const PATCH = proxyData
export const DELETE = proxyData
