import type { BlogPostListResponse, BlogPostDetail } from "../types.js";
import { assertWebsiteId, normalizeWebsiteId } from "../env/assert-website-id.js";

export interface BlogFetchOptions {
  websiteId: string;
  /** Express API base URL. Defaults to https://api.luminum.app */
  apiBaseUrl?: string;
  /** Preview token for accessing draft posts (org-scoped). */
  previewToken?: string;
  /** Override fetch revalidation seconds for Next.js data cache. */
  revalidateSeconds?: number;
  /** Force no-store requests (useful for preview/admin surfaces). */
  noStore?: boolean;
  /** Extra fetch options such as headers, signal, or next tags. */
  fetchOptions?: RequestInit;
}

function baseUrl(opts: BlogFetchOptions): string {
  return (opts.apiBaseUrl ?? "https://api.luminum.app").replace(/\/$/, "");
}

function resolvedWebsiteId(
  raw: string | undefined | null,
  label: string,
): string {
  assertWebsiteId(raw, label);
  return normalizeWebsiteId(raw);
}

function buildRequestInit(
  opts: BlogFetchOptions,
  fallbackRevalidate: number
): RequestInit {
  const nextFromCaller = (opts.fetchOptions as RequestInit & {
    next?: Record<string, unknown>;
  } | undefined)?.next;
  const shouldNoStore = Boolean(opts.noStore || opts.previewToken);
  const revalidate =
    typeof opts.revalidateSeconds === "number"
      ? opts.revalidateSeconds
      : fallbackRevalidate;

  const next =
    nextFromCaller ?? (shouldNoStore ? undefined : { revalidate });

  return {
    ...(opts.fetchOptions ?? {}),
    ...(shouldNoStore ? { cache: "no-store" as const } : {}),
    ...(next ? { next } : {}),
  };
}

/**
 * Fetch published blog posts from the Luminum API (server-side).
 * Returns paginated summaries with cover images and publish dates.
 */
export async function getPublishedPosts(
  opts: BlogFetchOptions & { page?: number; limit?: number }
): Promise<BlogPostListResponse> {
  const websiteId = resolvedWebsiteId(opts.websiteId, "getPublishedPosts");
  const url = new URL(`${baseUrl(opts)}/api/blog/posts`);
  url.searchParams.set("websiteId", websiteId);
  if (opts.page) url.searchParams.set("page", String(opts.page));
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));

  const res = await fetch(url.toString(), {
    ...buildRequestInit(opts, 300),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch blog posts (${res.status}) for websiteId "${websiteId}".`
    );
  }
  return res.json();
}

/**
 * Fetch all published blog posts across all pages.
 * Useful for sitemaps.
 */
export async function getAllPublishedPosts(
  opts: BlogFetchOptions
): Promise<import("../types.js").BlogPostSummary[]> {
  const all: import("../types.js").BlogPostSummary[] = [];
  let page = 1;
  const limit = 50;
  while (true) {
    const data = await getPublishedPosts({ ...opts, page, limit });
    all.push(...data.posts);
    if (page >= data.totalPages) break;
    page++;
  }
  return all;
}

/**
 * Fetch a single published blog post by slug.
 * Returns the post metadata, renderSpec for rendering, and SEO payload for metadata.
 */
export async function getPublishedPostBySlug(
  opts: BlogFetchOptions & { slug: string }
): Promise<BlogPostDetail | null> {
  const websiteId = resolvedWebsiteId(opts.websiteId, "getPublishedPostBySlug");
  const url = new URL(
    `${baseUrl(opts)}/api/blog/posts/${encodeURIComponent(opts.slug)}`
  );
  url.searchParams.set("websiteId", websiteId);
  if (opts.previewToken) url.searchParams.set("previewToken", opts.previewToken);

  const res = await fetch(url.toString(), {
    ...buildRequestInit(opts, 300),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `Failed to fetch blog post "${opts.slug}" (${res.status}) for websiteId "${websiteId}".`
    );
  }
  return res.json();
}

/**
 * Search published blog posts by query text and/or category.
 */
export async function searchPosts(
  opts: BlogFetchOptions & { q?: string; category?: string; page?: number; limit?: number }
): Promise<BlogPostListResponse> {
  const websiteId = resolvedWebsiteId(opts.websiteId, "searchPosts");
  const url = new URL(`${baseUrl(opts)}/api/blog/posts/search`);
  url.searchParams.set("websiteId", websiteId);
  if (opts.q) url.searchParams.set("q", opts.q);
  if (opts.category) url.searchParams.set("category", opts.category);
  if (opts.previewToken) url.searchParams.set("previewToken", opts.previewToken);
  if (opts.page) url.searchParams.set("page", String(opts.page));
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));

  const res = await fetch(url.toString(), {
    ...buildRequestInit(opts, 300),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to search blog posts (${res.status}) for websiteId "${websiteId}".`
    );
  }
  return res.json();
}

export interface BlogCategory {
  name: string;
  slug: string;
}

/**
 * Fetch the list of distinct categories from published blog posts.
 */
export async function getCategories(
  opts: BlogFetchOptions
): Promise<{ categories: BlogCategory[] }> {
  const websiteId = resolvedWebsiteId(opts.websiteId, "getCategories");
  const url = new URL(`${baseUrl(opts)}/api/blog/categories`);
  url.searchParams.set("websiteId", websiteId);
  if (opts.previewToken) url.searchParams.set("previewToken", opts.previewToken);

  const res = await fetch(url.toString(), {
    ...buildRequestInit(opts, 300),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch categories (${res.status}) for websiteId "${websiteId}".`
    );
  }
  return res.json();
}

/**
 * Fetch published posts for a specific category.
 */
export async function getPostsByCategory(
  opts: BlogFetchOptions & { categorySlug: string; page?: number; limit?: number }
): Promise<BlogPostListResponse> {
  const websiteId = resolvedWebsiteId(opts.websiteId, "getPostsByCategory");
  const url = new URL(`${baseUrl(opts)}/api/blog/posts/by-category`);
  url.searchParams.set("websiteId", websiteId);
  url.searchParams.set("categorySlug", opts.categorySlug);
  if (opts.previewToken) url.searchParams.set("previewToken", opts.previewToken);
  if (opts.page) url.searchParams.set("page", String(opts.page));
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));

  const res = await fetch(url.toString(), {
    ...buildRequestInit(opts, 300),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch posts by category "${opts.categorySlug}" (${res.status}) for websiteId "${websiteId}".`
    );
  }
  return res.json();
}
