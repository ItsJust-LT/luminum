import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/config.js";

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
 * Ensures the request has a valid session and attaches user to the request.
 * Responds with 401 when no valid session is present.
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
      res.status(401).json({ error: UNAUTHENTICATED_MESSAGE });
      return;
    }
    req.session = session;
    req.user = session.user;
    next();
  } catch {
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
    }
  } catch {
    // Intentionally ignore; session is optional
  }
  next();
}
