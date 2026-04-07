import { getPublishedPosts, getCategories } from "../blog/fetch.js";
import type { BlogFetchOptions } from "../blog/fetch.js";

export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface BlogSitemapOptions extends BlogFetchOptions {
  /** Your site's base URL, e.g. "https://yoursite.com". */
  baseUrl: string;
  /** Path prefix for blog post routes. Defaults to "/blog". */
  blogPathPrefix?: string;
  /** Path prefix for category pages. Defaults to "/blog/category". */
  categoryPathPrefix?: string;
  /** Include category page entries. Defaults to true. */
  includeCategories?: boolean;
  /** Include the blog index page itself (e.g. /blog). Defaults to true. */
  includeBlogIndex?: boolean;
  /** Max posts per API page when building sitemap. Defaults to 50. */
  pageSize?: number;
  /**
   * Fail fast instead of silently returning empty entries when blog/category fetch fails.
   * Defaults to false for backwards compatibility.
   */
  strict?: boolean;
  /** Optional callback for observability when a blog/category fetch fails. */
  onError?: (error: unknown, stage: "posts" | "categories" | "page") => void;
}

function normalizePrefix(prefix: string, fallback: string): string {
  const raw = (prefix || fallback).trim();
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`;
}

/**
 * Generate sitemap entries for all published blog posts (paginated fetching)
 * and optionally for category pages. Avoids loading all posts at once.
 *
 * @example
 * ```ts
 * // app/sitemap.ts
 * import { getBlogSitemapEntries } from "@itsjust-lt/website-kit/metadata";
 *
 * export default async function sitemap() {
 *   const blogEntries = await getBlogSitemapEntries({
 *     websiteId: process.env.LUMINUM_WEBSITE_ID!,
 *     baseUrl: "https://yoursite.com",
 *   });
 *   return [
 *     { url: "https://yoursite.com", lastModified: new Date() },
 *     ...blogEntries,
 *   ];
 * }
 * ```
 */
export async function getBlogSitemapEntries(
  opts: BlogSitemapOptions
): Promise<SitemapEntry[]> {
  const postPrefix = normalizePrefix(opts.blogPathPrefix ?? "/blog", "/blog");
  const categoryPrefix = normalizePrefix(opts.categoryPathPrefix ?? "/blog/category", "/blog/category");
  const base = opts.baseUrl.replace(/\/$/, "");
  const pageSize = opts.pageSize ?? 50;
  const includeCategories = opts.includeCategories !== false;
  const includeBlogIndex = opts.includeBlogIndex !== false;

  const entries: SitemapEntry[] = [];
  let page = 1;

  if (includeBlogIndex && postPrefix) {
    entries.push({
      url: `${base}${postPrefix}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  try {
    while (true) {
      const data = await getPublishedPosts({ ...opts, page, limit: pageSize });
      for (const post of data.posts) {
        entries.push({
          url: `${base}${postPrefix}/${encodeURIComponent(post.slug)}`,
          lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
      if (page >= data.totalPages) break;
      page++;
    }
  } catch (error) {
    opts.onError?.(error, "posts");
    if (opts.strict) throw error;
    // Blogs disabled, network error, or 404 from API — omit blog URLs from sitemap.
    return entries;
  }

  if (includeCategories) {
    try {
      const { categories } = await getCategories(opts);
      for (const cat of categories) {
        entries.push({
          url: `${base}${categoryPrefix}/${encodeURIComponent(cat.slug)}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    } catch (error) {
      opts.onError?.(error, "categories");
      if (opts.strict) throw error;
      // categories endpoint may not exist yet on older backends
    }
  }

  return entries;
}

/**
 * Get a single page of blog sitemap entries (for sitemap index patterns).
 */
export async function getBlogSitemapEntriesPage(
  opts: BlogSitemapOptions & { page: number }
): Promise<{ entries: SitemapEntry[]; totalPages: number }> {
  const postPrefix = normalizePrefix(opts.blogPathPrefix ?? "/blog", "/blog");
  const base = opts.baseUrl.replace(/\/$/, "");
  const pageSize = opts.pageSize ?? 50;

  try {
    const data = await getPublishedPosts({ ...opts, page: opts.page, limit: pageSize });
    const entries: SitemapEntry[] = data.posts.map((post) => ({
      url: `${base}${postPrefix}/${encodeURIComponent(post.slug)}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    return { entries, totalPages: data.totalPages };
  } catch (error) {
    opts.onError?.(error, "page");
    if (opts.strict) throw error;
    return { entries: [], totalPages: 1 };
  }
}
