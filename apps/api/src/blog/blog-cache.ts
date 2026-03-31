import { cacheDelByPrefix } from "../lib/redis-cache.js";

/** Published-list/detail/search Redis keys only. */
export async function invalidatePublishedBlogCache(organizationId: string): Promise<void> {
  await cacheDelByPrefix(`blog:pub:${organizationId}:`);
}

/** Clear published + draft-scoped search/category caches for an org (e.g. blogs_enabled toggle). */
export async function invalidateAllBlogCacheForOrganization(organizationId: string): Promise<void> {
  await cacheDelByPrefix(`blog:pub:${organizationId}:`);
  await cacheDelByPrefix(`blog:draft:${organizationId}:`);
}
