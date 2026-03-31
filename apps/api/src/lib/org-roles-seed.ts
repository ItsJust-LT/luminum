import type { Prisma, PrismaClient } from "@luminum/database";
import {
  BUILTIN_ROLE_UI,
  DEFAULT_MEMBER_TEMPLATE_PERMISSION_IDS,
  ORG_ROLE_KIND,
  expandPermissionSet,
  type OrgRoleKind,
} from "@luminum/org-permissions";

type Db = PrismaClient | Prisma.TransactionClient;

export async function ensureBuiltinRolesForOrganization(db: Db, organizationId: string): Promise<void> {
  const owner = await db.organization_role.findFirst({
    where: { organizationId, kind: ORG_ROLE_KIND.owner },
  });
  if (owner) {
    await backfillMemberRoleIds(db, organizationId);
    return;
  }

  const now = new Date();
  const ownerId = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const memberTemplateId = crypto.randomUUID();

  await db.organization_role.createMany({
    data: [
      {
        id: ownerId,
        organizationId,
        name: BUILTIN_ROLE_UI.owner.label,
        slug: "owner",
        color: BUILTIN_ROLE_UI.owner.color,
        iconKey: BUILTIN_ROLE_UI.owner.iconKey,
        kind: ORG_ROLE_KIND.owner,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: adminId,
        organizationId,
        name: BUILTIN_ROLE_UI.admin.label,
        slug: "admin",
        color: BUILTIN_ROLE_UI.admin.color,
        iconKey: BUILTIN_ROLE_UI.admin.iconKey,
        kind: ORG_ROLE_KIND.admin,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: memberTemplateId,
        organizationId,
        name: BUILTIN_ROLE_UI.member_template.label,
        slug: "member",
        color: BUILTIN_ROLE_UI.member_template.color,
        iconKey: BUILTIN_ROLE_UI.member_template.iconKey,
        kind: ORG_ROLE_KIND.member_template,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  const expanded = expandPermissionSet(DEFAULT_MEMBER_TEMPLATE_PERMISSION_IDS);
  await db.organization_role_permission.createMany({
    data: [...expanded].map((permission) => ({
      id: crypto.randomUUID(),
      roleId: memberTemplateId,
      permission,
    })),
  });

  await backfillMemberRoleIds(db, organizationId, { ownerId, adminId, memberTemplateId });
}

async function backfillMemberRoleIds(
  db: Db,
  organizationId: string,
  ids?: { ownerId: string; adminId: string; memberTemplateId: string },
): Promise<void> {
  let ownerId = ids?.ownerId;
  let adminId = ids?.adminId;
  let memberTemplateId = ids?.memberTemplateId;
  if (!ownerId || !adminId || !memberTemplateId) {
    const roles = await db.organization_role.findMany({
      where: { organizationId, kind: { in: [ORG_ROLE_KIND.owner, ORG_ROLE_KIND.admin, ORG_ROLE_KIND.member_template] } },
    });
    ownerId = roles.find((r) => r.kind === ORG_ROLE_KIND.owner)?.id;
    adminId = roles.find((r) => r.kind === ORG_ROLE_KIND.admin)?.id;
    memberTemplateId = roles.find((r) => r.kind === ORG_ROLE_KIND.member_template)?.id;
  }
  if (!ownerId || !adminId || !memberTemplateId) return;

  const map: Record<string, string> = {
    owner: ownerId,
    admin: adminId,
    member: memberTemplateId,
  };

  const members = await db.member.findMany({
    where: { organizationId, organizationRoleId: null },
    select: { id: true, role: true },
  });
  for (const m of members) {
    const r = (m.role || "member").toLowerCase();
    const roleId = map[r] ?? memberTemplateId;
    await db.member.update({ where: { id: m.id }, data: { organizationRoleId: roleId } });
  }
}

export function isBuiltinKind(kind: string): kind is OrgRoleKind {
  return (
    kind === ORG_ROLE_KIND.owner ||
    kind === ORG_ROLE_KIND.admin ||
    kind === ORG_ROLE_KIND.member_template ||
    kind === ORG_ROLE_KIND.custom
  );
}

/** Maps legacy `member.role` string to built-in `organization_role` row id (after ensuring seeds exist). */
export async function resolveBuiltinRoleRowId(
  db: Db,
  organizationId: string,
  legacyRole: "owner" | "admin" | "member",
): Promise<string | null> {
  await ensureBuiltinRolesForOrganization(db, organizationId);
  const kind =
    legacyRole === "owner"
      ? ORG_ROLE_KIND.owner
      : legacyRole === "admin"
        ? ORG_ROLE_KIND.admin
        : ORG_ROLE_KIND.member_template;
  const row = await db.organization_role.findFirst({
    where: { organizationId, kind },
    select: { id: true },
  });
  return row?.id ?? null;
}
