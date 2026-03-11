/**
 * Backup live viewer count to Redis so it survives API restarts.
 * Fire-and-forget; no await in callers.
 */
import { getRedisClient } from "./redis.js";

const KEY_PREFIX = "luminum:live:";
const TTL_SEC = 120;

export function backupLiveCountToRedis(websiteId: string, count: number): void {
  void (async () => {
    const redis = await getRedisClient();
    if (!redis) return;
    try {
      await redis.setEx(KEY_PREFIX + websiteId, TTL_SEC, String(count));
    } catch {
      // ignore
    }
  })();
}
