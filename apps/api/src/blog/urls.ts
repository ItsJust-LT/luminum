import { config } from "../config.js";

/** Public URL for crawlers/clients to load a private blog object key. */
export function publicBlogAssetUrl(key: string, options?: { previewToken?: string }): string {
  const base = config.apiUrl.replace(/\/$/, "");
  let u = `${base}/api/public/blog-assets/${encodeURIComponent(key)}`;
  const t = options?.previewToken?.trim();
  if (t) {
    u += `?previewToken=${encodeURIComponent(t)}`;
  }
  return u;
}

function appendPreviewTokenToString(s: string, previewToken: string): string {
  const base = config.apiUrl.replace(/\/$/, "");
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const absRe = new RegExp(`${escaped}/api/public/blog-assets/[^?\\s"'<>]+`, "g");
  return s.replace(absRe, (url) => {
    if (url.includes("previewToken=")) return url;
    return `${url}${url.includes("?") ? "&" : "?"}previewToken=${encodeURIComponent(previewToken)}`;
  });
}

/** Rewrite absolute/relative blog-asset URLs inside strings (e.g. renderSpec HTML) for draft preview. */
export function deepAppendPreviewTokenToPublicBlogAssetUrls<T>(value: T, previewToken: string): T {
  const t = previewToken.trim();
  if (!t) return value;
  if (typeof value === "string") return appendPreviewTokenToString(value, t) as T;
  if (Array.isArray(value)) {
    return value.map((v) => deepAppendPreviewTokenToPublicBlogAssetUrls(v, t)) as T;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deepAppendPreviewTokenToPublicBlogAssetUrls(v, t);
    }
    return out as T;
  }
  return value;
}

/**
 * If URL points at our blog-asset proxy, returns the decoded storage key; otherwise null.
 */
export function extractBlogAssetKeyFromPublicUrl(url: string): string | null {
  const u = url.trim();
  const base = config.apiUrl.replace(/\/$/, "");
  const absPrefix = `${base}/api/public/blog-assets/`;
  if (u.startsWith(absPrefix)) {
    const rest = u.slice(absPrefix.length).split(/[?#]/)[0] ?? "";
    try {
      return decodeURIComponent(rest);
    } catch {
      return null;
    }
  }
  if (u.startsWith("/api/public/blog-assets/")) {
    const rest = u.slice("/api/public/blog-assets/".length).split(/[?#]/)[0] ?? "";
    try {
      return decodeURIComponent(rest);
    } catch {
      return null;
    }
  }

  // Dashboard Next.js proxy (editor / drafts): /api/blog-asset?key=<storage key>
  // or absolute URL to the dashboard host with the same path.
  try {
    const parsed = new URL(u, "https://placeholder.invalid");
    const pathname = parsed.pathname.replace(/\/$/, "") || "/";
    if (pathname === "/api/blog-asset") {
      const key = parsed.searchParams.get("key");
      if (key?.trim()) return key.trim();
    }
  } catch {
    /* ignore */
  }

  return null;
}
