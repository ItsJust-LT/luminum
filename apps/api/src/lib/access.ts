import { prisma } from "./prisma.js";

export type UserForAccess = { id: string; role?: string };

/**
 * Returns true if the user can access the organization: either they are a
 * platform admin (role === 'admin') or they are a member of the organization.
 */
export async function canAccessOrganization(
  organizationId: string,
  user: UserForAccess
): Promise<boolean> {
  if (user.role === "admin") return true;
  const member = await prisma.member.findFirst({
    where: { organizationId, userId: user.id },
    select: { id: true },
  });
  return !!member;
}

/**
 * Returns the member's role in the organization, or { role: 'admin' } for
 * platform admins (so callers can treat them as having full access).
 * Returns null if the user has no access.
 */
export async function getMemberOrAdmin(
  organizationId: string,
  user: UserForAccess
): Promise<{ role: string } | null> {
  if (user.role === "admin") return { role: "owner" };
  const member = await prisma.member.findFirst({
    where: { organizationId, userId: user.id },
    select: { role: true },
  });
  return member ? { role: member.role } : null;
}
