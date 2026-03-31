import type { PrismaClient } from "@luminum/database";
import {
  GRANTABLE_PERMISSION_IDS,
  expandPermissionSet,
  getAllGrantablePermissionsSet,
  ORG_ROLE_KIND,
} from "@luminum/org-permissions";
import { ensureBuiltinRolesForOrganization } from "./org-roles-seed.js";

export type UserForPermissions = { id: string; role?: string };

const ALL_GRANTABLE = getAllGrantablePermissionsSet();

export type ResolvedOrgAccess = {
  effectivePermissions: Set<string>;
  /** Built-in owner/admin/member_template/custom for display */
  organizationRole: {
    id: string;
    name: string;
    color: string;
    iconKey: string;
    kind: string;
  } | null;
  memberRoleString: string;
};

export async function resolveOrgMemberPermissions(
  prisma: PrismaClient,
  organizationId: string,
  user: UserForPermissions,
): Promise<ResolvedOrgAccess | null> {
  if (user.role === "admin") {
    return {
      effectivePermissions: new Set(ALL_GRANTABLE),
      organizationRole: null,
      memberRoleString: "admin",
    };
  }

  await ensureBuiltinRolesForOrganization(prisma, organizationId);

  const member = await prisma.member.findFirst({
    where: { organizationId, userId: user.id },
    include: {
      organization_role: {
        include: { permissions: true },
      },
    },
  });
  if (!member) return null;

  const roleStr = (member.role || "member").toLowerCase();

  if (roleStr === "owner") {
    return {
      effectivePermissions: new Set(ALL_GRANTABLE),
      organizationRole: member.organization_role
        ? {
            id: member.organization_role.id,
            name: member.organization_role.name,
            color: member.organization_role.color,
            iconKey: member.organization_role.iconKey,
            kind: member.organization_role.kind,
          }
        : null,
      memberRoleString: "owner",
    };
  }

  if (roleStr === "admin") {
    return {
      effectivePermissions: new Set(ALL_GRANTABLE),
      organizationRole: member.organization_role
        ? {
            id: member.organization_role.id,
            name: member.organization_role.name,
            color: member.organization_role.color,
            iconKey: member.organization_role.iconKey,
            kind: member.organization_role.kind,
          }
        : null,
      memberRoleString: "admin",
    };
  }

  const orgRole = member.organization_role;
  if (orgRole?.kind === ORG_ROLE_KIND.owner || orgRole?.kind === ORG_ROLE_KIND.admin) {
    return {
      effectivePermissions: new Set(ALL_GRANTABLE),
      organizationRole: {
        id: orgRole.id,
        name: orgRole.name,
        color: orgRole.color,
        iconKey: orgRole.iconKey,
        kind: orgRole.kind,
      },
      memberRoleString: roleStr,
    };
  }

  const raw = orgRole?.permissions.map((p) => p.permission) ?? [];
  const effective = expandPermissionSet(raw);

  return {
    effectivePermissions: effective,
    organizationRole: orgRole
      ? {
          id: orgRole.id,
          name: orgRole.name,
          color: orgRole.color,
          iconKey: orgRole.iconKey,
          kind: orgRole.kind,
        }
      : null,
    memberRoleString: roleStr,
  };
}

export function hasOrgPermissions(effective: Set<string>, required: readonly string[]): boolean {
  return required.every((r) => effective.has(r));
}

export { GRANTABLE_PERMISSION_IDS };
