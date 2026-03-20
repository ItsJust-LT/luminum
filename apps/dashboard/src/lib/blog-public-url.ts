/** Browser-side API base for building public blog asset URLs (same host as authenticated API). */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
  }
  return (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
}

/** Public URL — only works for assets tied to published posts (crawlers / live site). */
export function publicBlogAssetUrlFromKey(key: string): string {
  const base = getApiBaseUrl();
  return `${base}/api/public/blog-assets/${encodeURIComponent(key)}`;
}

/**
 * Dashboard thumbnails & editor: same-origin proxy forwards cookies to authenticated API.
 * Use for draft covers and in-post uploads while editing.
 */
export function dashboardBlogAssetUrlFromKey(key: string): string {
  if (!key?.trim()) return "";
  return `/api/blog-asset?key=${encodeURIComponent(key)}`;
}

/** Public marketing site base URL from org metadata (`publicBaseUrl` | `baseUrl` | `siteUrl`). */
export function getPublicSiteBaseFromOrgMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const raw = m.publicBaseUrl ?? m.baseUrl ?? m.siteUrl;
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  return t ? t.replace(/\/$/, "") : null;
}
