// lib/redis.ts
import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

client.on("error", (err) => console.error("Redis Client Error", err));

let redis: ReturnType<typeof createClient>;

export async function getRedisClient() {
  if (!redis) {
    redis = client;
    if (!redis.isOpen) {
      await redis.connect();
    }
  }
  return redis;
}
