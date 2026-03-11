/**
 * Rate limit middleware using Redis. When Redis is unavailable, allows the request (no limit).
 * Key: luminum:ratelimit:{scope}:{identifier}
 */
import { Request, Response, NextFunction } from "express";
import { getRedisClient } from "../lib/redis.js";

const PREFIX = "luminum:ratelimit:";
const WINDOW_SEC = 60;
const MAX_REQUESTS = 100;

function getClientId(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

export function rateLimitWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  void (async () => {
    const redis = await getRedisClient();
    if (!redis) {
      next();
      return;
    }
    const id = getClientId(req);
    const key = `${PREFIX}webhook:${id}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, WINDOW_SEC);
      if (count > MAX_REQUESTS) {
        res.status(429).json({ error: "Too many requests" });
        return;
      }
    } catch {
      // Redis error: allow request
    }
    next();
  })();
}
