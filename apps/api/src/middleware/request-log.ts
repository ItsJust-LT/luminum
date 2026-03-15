import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      requestStartAt?: number;
    }
  }
}

/**
 * Assigns requestId and logs each request after completion (method, path, status, duration).
 * Also persists request log to system_logs for admin viewing.
 */
export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  req.requestStartAt = Date.now();

  res.on("finish", () => {
    const duration = req.requestStartAt != null ? Date.now() - req.requestStartAt : 0;
    const path = req.originalUrl || req.url || "";
    const method = req.method || "";
    const status = res.statusCode;
    const userId = (req as any).user?.id;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    const message = `${method} ${path} ${status} ${duration}ms`;
    logger[level](message, { method, path, status, durationMs: duration, userId: userId ?? undefined }, req.requestId);
  });

  next();
}
