import { NextRequest, NextResponse } from "next/server"

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
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
    API_URL,
  )

  const headers = new Headers(req.headers)
  headers.delete("host")
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

  apiRes.headers.forEach((v, k) => {
    if (k.toLowerCase() !== "set-cookie") res.headers.set(k, v)
  })

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
