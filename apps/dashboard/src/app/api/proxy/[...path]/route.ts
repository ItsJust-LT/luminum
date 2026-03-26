import { NextRequest, NextResponse } from "next/server"

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"

async function proxyData(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/").slice(3) // strip ["", "api", "proxy"]
  const path = "/" + segments.join("/")
  const url = new URL(path + req.nextUrl.search, API_URL)

  const headers = new Headers(req.headers)
  headers.delete("host")

  const body = ["GET", "HEAD"].includes(req.method)
    ? undefined
    : await req.text()

  const apiRes = await fetch(url, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  })

  return new NextResponse(apiRes.body, {
    status: apiRes.status,
    statusText: apiRes.statusText,
    headers: apiRes.headers,
  })
}

export const GET = proxyData
export const POST = proxyData
export const PUT = proxyData
export const PATCH = proxyData
export const DELETE = proxyData
