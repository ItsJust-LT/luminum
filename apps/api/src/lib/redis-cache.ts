/**
 * Redis cache helper with key prefix and TTL.
 * No-ops when Redis is unavailable; callers should fall back to DB.
 */
import { getRedisClient } from "./redis.js";

const PREFIX = "luminum:cache:";
const DEFAULT_TTL_SEC = 120;

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(PREFIX + key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSec: number = DEFAULT_TTL_SEC
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    const fullKey = PREFIX + key;
    await redis.setEx(fullKey, ttlSec, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/** Remove a single cache entry. */
export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.del(PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Delete all keys with Redis prefix luminum:cache:{prefix}.
 * Uses SCAN (safe for large keyspaces vs KEYS *).
 */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  const match = `${PREFIX}${prefix}*`;
  try {
    for await (const fullKey of redis.scanIterator({ MATCH: match, COUNT: 200 })) {
      await redis.del(fullKey);
    }
  } catch {
    // ignore
  }
}

const ANALYTICS_DIRTY_PREFIX = "analytics:dirty:";
const ANALYTICS_DIRTY_TTL_SEC = 15;

/** Mark analytics cache as dirty for a website so next overview/timeseries request skips cache. */
export async function setAnalyticsDirty(websiteId: string): Promise<void> {
  await cacheSet(ANALYTICS_DIRTY_PREFIX + websiteId, "1", ANALYTICS_DIRTY_TTL_SEC);
}

/** Returns true if analytics cache was recently invalidated for this website. */
export async function isAnalyticsDirty(websiteId: string): Promise<boolean> {
  const val = await cacheGet<string>(ANALYTICS_DIRTY_PREFIX + websiteId);
  return val === "1";
}
