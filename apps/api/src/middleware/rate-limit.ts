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

const AUDIT_WINDOW_SEC = 3600;
const AUDIT_MAX_REQUESTS = 30;

const AUDIT_BOOTSTRAP_WINDOW_SEC = 3600;
const AUDIT_BOOTSTRAP_MAX_REQUESTS = 60;

/**
 * Rate limit for manual site audit scans (per user, 30/hour).
 */
export function rateLimitAudit(
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
    const userId = (req as any).user?.id ?? getClientId(req);
    const key = `${PREFIX}audit:${userId}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, AUDIT_WINDOW_SEC);
      if (count > AUDIT_MAX_REQUESTS) {
        res.status(429).json({ error: "Rate limit exceeded — maximum 30 scans per hour" });
        return;
      }
    } catch {
      // Redis error: allow request
    }
    next();
  })();
}

/**
 * Auto first-scan bootstrap (idempotent on server); higher cap than manual runs.
 */
export function rateLimitAuditBootstrap(
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
    const userId = (req as any).user?.id ?? getClientId(req);
    const key = `${PREFIX}audit-bootstrap:${userId}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, AUDIT_BOOTSTRAP_WINDOW_SEC);
      if (count > AUDIT_BOOTSTRAP_MAX_REQUESTS) {
        res.status(429).json({ error: "Rate limit exceeded for auto-scan checks" });
        return;
      }
    } catch {
      // Redis error: allow request
    }
    next();
  })();
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
