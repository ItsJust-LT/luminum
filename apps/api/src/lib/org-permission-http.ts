import type { Response } from "express";
import { INSUFFICIENT_PERMISSIONS_CODE } from "@luminum/org-permissions";
import { prisma } from "./prisma.js";
import {
  hasOrgPermissions,
  resolveOrgMemberPermissions,
  type ResolvedOrgAccess,
} from "./org-permissions-resolve.js";

export function sendInsufficientPermissions(res: Response, required: readonly string[]): void {
  res.status(403).json({
    success: false,
    error: "Insufficient permissions",
    code: INSUFFICIENT_PERMISSIONS_CODE,
    required: [...required],
  });
}

export async function requireOrgPermissions(
  organizationId: string,
  user: { id: string; role?: string },
  res: Response,
  required: readonly string[],
): Promise<{ effective: Set<string>; resolved: ResolvedOrgAccess } | null> {
  const resolved = await resolveOrgMemberPermissions(prisma, organizationId, user);
  if (!resolved) {
    res.status(403).json({ success: false, error: "Access denied" });
    return null;
  }
  if (!hasOrgPermissions(resolved.effectivePermissions, required)) {
    sendInsufficientPermissions(res, required);
    return null;
  }
  return { effective: resolved.effectivePermissions, resolved };
}

export async function tryResolveOrgAccess(
  organizationId: string,
  user: { id: string; role?: string },
): Promise<ResolvedOrgAccess | null> {
  return resolveOrgMemberPermissions(prisma, organizationId, user);
}

export { hasOrgPermissions };
