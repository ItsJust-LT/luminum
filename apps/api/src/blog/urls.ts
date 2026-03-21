import { config } from "../config.js";

/** Public URL for crawlers/clients to load a private blog object key. */
export function publicBlogAssetUrl(key: string): string {
  const base = config.apiUrl.replace(/\/$/, "");
  return `${base}/api/public/blog-assets/${encodeURIComponent(key)}`;
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
