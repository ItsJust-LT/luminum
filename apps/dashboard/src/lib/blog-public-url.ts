/** Browser-side API base for building public blog asset URLs (same host as authenticated API). */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
  }
  return (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
}

export function publicBlogAssetUrlFromKey(key: string): string {
  const base = getApiBaseUrl();
  return `${base}/api/public/blog-assets/${encodeURIComponent(key)}`;
}
