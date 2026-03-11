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
