import { NextRequest } from "next/server";
import { getInternalApiBaseUrl } from "@/lib/internal-api-url";

/**
 * Same-origin proxy so <img src> can load org blog assets with session cookies
 * (draft covers / uploads are not available on the unauthenticated public blog-assets route).
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key?.trim()) {
    return new Response("Missing key", { status: 400 });
  }
  const cookie = req.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${getInternalApiBaseUrl()}/api/blog/asset?key=${encodeURIComponent(key)}`,
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
  headers.set("cache-control", "private, max-age=60");
  const cd = upstream.headers.get("content-disposition");
  if (cd) headers.set("content-disposition", cd);
  return new Response(upstream.body, { headers });
}
