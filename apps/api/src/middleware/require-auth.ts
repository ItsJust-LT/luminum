import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/config.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      session?: any;
      user?: any;
    }
  }
}

/** Standard error payload for unauthenticated requests. */
const UNAUTHENTICATED_MESSAGE = "Authentication required";

/**
 * Ensures user has role set (for admin bypass). Session may not include role; load from DB if missing.
 * Exported for use in WebSocket upgrade (realtime-ws) so admin role is available there too.
 */
export async function ensureUserRole(user: { id: string; role?: string | null }): Promise<void> {
  if (user.role !== undefined && user.role !== null) return;
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (row?.role) (user as { role?: string }).role = row.role;
}

/**
 * Ensures the request has a valid session and attaches user to the request.
 * Responds with 401 when no valid session is present.
 * Enriches user.role from DB when missing so admin bypass (canAccessOrganization, etc.) works.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user?.id) {
      const reqWithId = req as Request & { requestId?: string };
      logger.warn("Auth required", { path: req.originalUrl || req.url, status: 401 }, reqWithId.requestId);
      res.status(401).json({ error: UNAUTHENTICATED_MESSAGE });
      return;
    }
    req.session = session;
    req.user = session.user;
    await ensureUserRole(req.user);
    next();
  } catch (err) {
    const reqWithId = req as Request & { requestId?: string };
    logger.logError(err, "Session check failed", { path: req.originalUrl || req.url }, reqWithId.requestId);
    res.status(401).json({ error: UNAUTHENTICATED_MESSAGE });
  }
}

/**
 * Attaches session and user when a valid session exists; does not require auth.
 * Use for routes that behave differently for logged-in users.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session?.user?.id) {
      req.session = session;
      req.user = session.user;
      await ensureUserRole(req.user);
    }
  } catch {
    // Intentionally ignore; session is optional
  }
  next();
}
