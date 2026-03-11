import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient> | null = null;

if (REDIS_URL) {
  client = createClient({
    url: REDIS_URL,
    ...(REDIS_PASSWORD && { password: REDIS_PASSWORD }),
  });
  client.on("error", (err) => console.warn("Redis Client Error", err));
}

/** Returns the Redis client if REDIS_URL is set; otherwise null. Connects on first use. */
export async function getRedisClient(): Promise<ReturnType<typeof createClient> | null> {
  if (!client) return null;
  if (!client.isOpen) {
    try {
      await client.connect();
    } catch (err) {
      console.warn("Redis connect failed, continuing without Redis:", err);
      return null;
    }
  }
  return client;
}

/** True when Redis is configured (REDIS_URL set). Does not guarantee connection. */
export function isRedisConfigured(): boolean {
  return !!REDIS_URL;
}
