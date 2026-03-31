import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"

/** Redirect to Gravatar for the normalized email (MD5 hash). Used as `<img src>` so the dashboard does not proxy the legacy `/api/proxy/api/avatar` path. */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim()
  if (!email) {
    return NextResponse.json({ error: "email query parameter required" }, { status: 400 })
  }
  const hash = createHash("md5").update(email.toLowerCase()).digest("hex")
  const target = `https://www.gravatar.com/avatar/${hash}?s=80&d=404`
  return NextResponse.redirect(target, 302)
}
