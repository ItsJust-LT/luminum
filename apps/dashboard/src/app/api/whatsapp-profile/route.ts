import { NextRequest } from "next/server";

const API_BASE = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
  /\/$/,
  ""
);

/** Same-origin proxy so <img src> loads WhatsApp avatars with the user's session cookie. */
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("organizationId")?.trim();
  const jid = req.nextUrl.searchParams.get("jid")?.trim();
  if (!orgId || !jid) {
    return new Response("Missing organizationId or jid", { status: 400 });
  }
  const cookie = req.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${API_BASE}/api/whatsapp/profile-photo?organizationId=${encodeURIComponent(orgId)}&jid=${encodeURIComponent(jid)}`,
    {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    }
  );
  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return new Response(errText || upstream.statusText, { status: upstream.status });
  }
  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  headers.set("cache-control", "private, max-age=3600");
  return new Response(upstream.body, { headers });
}
