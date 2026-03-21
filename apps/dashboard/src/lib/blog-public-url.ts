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

/**
 * Normalize user-entered website (full URL or bare domain) to `https://host` with no trailing slash.
 */
export function normalizePublicSiteInput(input: string): string {
  const t = input.trim().replace(/\/$/, "");
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  // Bare domain e.g. example.com or www.example.com
  if (/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}/.test(t)) {
    return `https://${t}`;
  }
  return t;
}

/**
 * Public marketing site base URL from org metadata or linked website domain.
 * Checks `website`, `websiteUrl`, `domain`, then legacy `publicBaseUrl` / `baseUrl` / `siteUrl`.
 */
export function getPublicSiteBaseFromOrgMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const keys = [
    "website",
    "websiteUrl",
    "websiteDomain",
    "domain",
    "publicBaseUrl",
    "baseUrl",
    "siteUrl",
  ] as const;
  for (const k of keys) {
    const raw = m[k];
    if (typeof raw === "string" && raw.trim()) {
      const n = normalizePublicSiteInput(raw);
      if (n) return n;
    }
  }
  return null;
}

/** Short label for UI, e.g. `example.com` from `https://example.com/blog`. */
export function getHostnameLabelForSiteBase(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    return u.hostname;
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0] ?? url;
  }
}
