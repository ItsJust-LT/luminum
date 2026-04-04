import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { requireOrgPermissions, hasOrgPermissions } from "../lib/org-permission-http.js";
import {
  ORG_ROLE_KIND,
  PERMISSIONS,
  ROLE_TEMPLATES,
  validatePermissionSelection,
  expandPermissionSet,
  filterPermissionIdsForOrgFeatures,
  getGrantablePermissionsSetForOrgFeatures,
  permissionSetsEqual,
  effectiveRolePermissionSetForOrgMatch,
  type OrgFeatureBooleans,
} from "@luminum/org-permissions";
import { ensureBuiltinRolesForOrganization } from "../lib/org-roles-seed.js";

const router = Router();
router.use(requireAuth);

async function loadOrgFeatureFlags(organizationId: string): Promise<OrgFeatureBooleans> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      emails_enabled: true,
      whatsapp_enabled: true,
      analytics_enabled: true,
      blogs_enabled: true,
      invoices_enabled: true,
    },
  });
  return org ?? {};
}

async function maybeDeleteOrphanCustomRole(
  prevRoleId: string | null | undefined,
  organizationId: string
): Promise<void> {
  if (!prevRoleId) return;
  const old = await prisma.organization_role.findFirst({
    where: { id: prevRoleId, organizationId, kind: ORG_ROLE_KIND.custom },
  });
  if (!old) return;
  const [memberCount, invCount] = await Promise.all([
    prisma.member.count({ where: { organizationRoleId: prevRoleId } }),
    prisma.invitation.count({ where: { organizationRoleId: prevRoleId } }),
  ]);
  if (memberCount > 0 || invCount > 0) return;
  await prisma.organization_role_permission.deleteMany({ where: { roleId: prevRoleId } });
  await prisma.organization_role.delete({ where: { id: prevRoleId } });
}

// GET /api/organization-roles/catalog — permission definitions + role templates (any authenticated user)
router.get("/catalog", (_req: Request, res: Response) => {
  res.json({
    success: true,
    permissions: PERMISSIONS,
    roleTemplates: ROLE_TEMPLATES,
  });
});

// GET /api/organization-roles?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    const pr = await requireOrgPermissions(organizationId, req.user, res, ["team:read"]);
    if (!pr) return;

    await ensureBuiltinRolesForOrganization(prisma, organizationId);
    const roles = await prisma.organization_role.findMany({
      where: { organizationId },
      include: { permissions: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });

    const canSeePerms = hasOrgPermissions(pr.effective, ["team:roles:manage"]);
    res.json({
      success: true,
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        color: r.color,
        iconKey: r.iconKey,
        kind: r.kind,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        permissions: canSeePerms ? r.permissions.map((p) => p.permission) : undefined,
        permissionCount: r.permissions.length,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.json({ success: false, error: msg });
  }
});

// POST /api/organization-roles?organizationId=...
router.post("/", async (req: Request, res: Response) => {
  try {
    const organizationId = (req.query.organizationId as string) || (req.body?.organizationId as string);
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:roles:manage"]))) return;

    const flags = await loadOrgFeatureFlags(organizationId);

    const body = req.body as {
      name?: string;
      color?: string;
      iconKey?: string;
      permissionIds?: string[];
      templateId?: string;
    };

    let permissionIds = body.permissionIds ?? [];
    if (body.templateId) {
      const t = ROLE_TEMPLATES.find((x) => x.id === body.templateId);
      if (!t) return res.status(400).json({ success: false, error: "Unknown template" });
      permissionIds = [...t.permissionIds];
    }
    permissionIds = filterPermissionIdsForOrgFeatures(permissionIds, flags);

    const name = (body.name || "Custom role").trim().slice(0, 120);
    const color = (body.color || "#64748b").trim().slice(0, 32);
    const iconKey = (body.iconKey || "User").trim().slice(0, 64);

    const v = validatePermissionSelection([...permissionIds]);
    if (!v.ok) return res.status(400).json({ success: false, error: v.error });
    const grantableOrg = getGrantablePermissionsSetForOrgFeatures(flags);
    const expandedCreate = new Set(
      [...expandPermissionSet(permissionIds)].filter((id) => grantableOrg.has(id))
    );
    if (expandedCreate.size === 0) {
      return res.status(400).json({ success: false, error: "Select at least one permission for an enabled product" });
    }

    const now = new Date();
    const roleId = crypto.randomUUID();
    await prisma.organization_role.create({
      data: {
        id: roleId,
        organizationId,
        name,
        slug: null,
        color,
        iconKey,
        kind: ORG_ROLE_KIND.custom,
        createdAt: now,
        updatedAt: now,
        permissions: {
          create: [...expandedCreate].map((permission) => ({
            id: crypto.randomUUID(),
            permission,
          })),
        },
      },
    });

    const created = await prisma.organization_role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });
    res.json({ success: true, role: created });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.json({ success: false, error: msg });
  }
});

// GET /api/organization-roles/member-access?organizationId=&memberRowId=
router.get("/member-access", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const memberRowId = req.query.memberRowId as string;
    if (!organizationId || !memberRowId) {
      return res.status(400).json({ success: false, error: "organizationId and memberRowId required" });
    }
    const pr = await requireOrgPermissions(organizationId, req.user, res, ["team:read"]);
    if (!pr) return;

    await ensureBuiltinRolesForOrganization(prisma, organizationId);
    const member = await prisma.member.findFirst({
      where: { id: memberRowId, organizationId },
      include: {
        user: { select: { name: true, email: true } },
        organization_role: { include: { permissions: true } },
      },
    });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    const roleStr = (member.role || "member").toLowerCase();
    const name = member.user?.name || member.user?.email || "Member";
    const email = member.user?.email || "";

    const memberPayload = {
      id: member.id,
      userId: member.userId,
      role: member.role,
      name,
      email,
      organizationRoleId: member.organizationRoleId,
      organizationRole: member.organization_role
        ? {
            id: member.organization_role.id,
            name: member.organization_role.name,
            kind: member.organization_role.kind,
            color: member.organization_role.color,
            iconKey: member.organization_role.iconKey,
          }
        : null,
    };

    const flags = await loadOrgFeatureFlags(organizationId);
    const grantableOrg = getGrantablePermissionsSetForOrgFeatures(flags);
    const grantableOrgList = [...grantableOrg];

    // Workspace owner: UI read-only (transfer ownership to change).
    if (roleStr === "owner") {
      return res.json({
        success: true,
        fullAccess: true,
        member: memberPayload,
        permissionIds: grantableOrgList,
      });
    }

    // Built-in Admin role has no organization_role_permission rows in DB (implicit full access).
    // Return org-scoped grantable ids so the matrix matches enabled product modules.
    const isBuiltinAdmin =
      roleStr === "admin" || member.organization_role?.kind === ORG_ROLE_KIND.admin;
    if (isBuiltinAdmin) {
      return res.json({
        success: true,
        fullAccess: false,
        member: memberPayload,
        permissionIds: grantableOrgList,
      });
    }

    const fromDb = member.organization_role?.permissions.map((p) => p.permission) ?? [];
    const closed = expandPermissionSet(fromDb);
    const permissionIdsOut = [...closed].filter((id) => grantableOrg.has(id));
    return res.json({
      success: true,
      fullAccess: false,
      member: memberPayload,
      permissionIds: permissionIdsOut,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.status(500).json({ success: false, error: msg });
  }
});

// PATCH /api/organization-roles/member-permissions — set permissions without naming a role (creates/updates a private custom role)
router.patch("/member-permissions", async (req: Request, res: Response) => {
  try {
    const organizationId = (req.query.organizationId as string) || (req.body?.organizationId as string);
    const memberRowId = req.body?.memberRowId as string | undefined;
    const permissionIds = req.body?.permissionIds as string[] | undefined;
    if (!organizationId || !memberRowId || !Array.isArray(permissionIds)) {
      return res.status(400).json({ success: false, error: "organizationId, memberRowId, and permissionIds required" });
    }
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:roles:assign"]))) return;

    await ensureBuiltinRolesForOrganization(prisma, organizationId);
    const member = await prisma.member.findFirst({
      where: { id: memberRowId, organizationId },
      include: { user: { select: { name: true, email: true } }, organization_role: true },
    });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    const roleStr = (member.role || "member").toLowerCase();
    if (roleStr === "owner") {
      return res.status(400).json({
        success: false,
        error: "The workspace owner cannot be edited here. Transfer ownership first if you need to change their access.",
      });
    }

    const flags = await loadOrgFeatureFlags(organizationId);
    const grantableOrg = getGrantablePermissionsSetForOrgFeatures(flags);
    const allowedIds = filterPermissionIdsForOrgFeatures(permissionIds, flags);
    const v = validatePermissionSelection(allowedIds);
    if (!v.ok) return res.status(400).json({ success: false, error: v.error });
    let expanded = new Set([...v.expanded].filter((id) => grantableOrg.has(id)));
    const vClosed = validatePermissionSelection([...expanded]);
    if (!vClosed.ok) return res.status(400).json({ success: false, error: vClosed.error });
    expanded = new Set([...vClosed.expanded].filter((id) => grantableOrg.has(id)));
    if (expanded.size === 0) {
      return res.status(400).json({
        success: false,
        error: "Select at least one permission for an enabled product in this workspace.",
      });
    }

    const now = new Date();
    const display = (member.user?.name || member.user?.email || "Member").trim().slice(0, 80);
    const prevRoleId = member.organizationRoleId;

    // Every permission enabled for this org → Admin (never Owner).
    if (permissionSetsEqual(expanded, grantableOrg)) {
      const adminRole = await prisma.organization_role.findFirst({
        where: { organizationId, kind: ORG_ROLE_KIND.admin },
      });
      if (!adminRole) {
        return res.status(500).json({ success: false, error: "Built-in Admin role is missing for this organization" });
      }
      await prisma.member.update({
        where: { id: memberRowId },
        data: { role: "admin", organizationRoleId: adminRole.id },
      });
      await maybeDeleteOrphanCustomRole(prevRoleId, organizationId);
      return res.json({ success: true, organizationRoleId: adminRole.id });
    }

    const roleRows = await prisma.organization_role.findMany({
      where: { organizationId, kind: { not: ORG_ROLE_KIND.owner } },
      include: { permissions: true },
    });
    const matches = roleRows.filter((r) =>
      permissionSetsEqual(
        effectiveRolePermissionSetForOrgMatch(
          r.kind,
          r.permissions.map((p) => p.permission),
          grantableOrg
        ),
        expanded
      )
    );

    if (matches.length === 1) {
      const target = matches[0]!;
      const newRoleStr = target.kind === ORG_ROLE_KIND.admin ? "admin" : "member";
      await prisma.member.update({
        where: { id: memberRowId },
        data: { role: newRoleStr, organizationRoleId: target.id },
      });
      await maybeDeleteOrphanCustomRole(prevRoleId, organizationId);
      return res.json({ success: true, organizationRoleId: target.id });
    }

    const existingRoleId = member.organizationRoleId;
    if (existingRoleId) {
      const existing = await prisma.organization_role.findFirst({
        where: { id: existingRoleId, organizationId },
      });
      const memberCount = existing
        ? await prisma.member.count({ where: { organizationRoleId: existing.id } })
        : 0;
      if (existing?.kind === ORG_ROLE_KIND.custom && memberCount === 1) {
        await prisma.organization_role_permission.deleteMany({ where: { roleId: existing.id } });
        await prisma.organization_role_permission.createMany({
          data: [...expanded].map((permission) => ({
            id: crypto.randomUUID(),
            roleId: existing.id,
            permission,
          })),
        });
        await prisma.organization_role.update({
          where: { id: existing.id },
          data: { name: `Access · ${display}`, updatedAt: now },
        });
        await prisma.member.update({
          where: { id: memberRowId },
          data: { role: "member", organizationRoleId: existing.id },
        });
        return res.json({ success: true, organizationRoleId: existing.id });
      }
    }

    const roleId = crypto.randomUUID();
    await prisma.organization_role.create({
      data: {
        id: roleId,
        organizationId,
        name: `Access · ${display}`,
        slug: null,
        color: "#64748b",
        iconKey: "User",
        kind: ORG_ROLE_KIND.custom,
        createdAt: now,
        updatedAt: now,
        permissions: {
          create: [...expanded].map((permission) => ({
            id: crypto.randomUUID(),
            permission,
          })),
        },
      },
    });

    await prisma.member.update({
      where: { id: memberRowId },
      data: { role: "member", organizationRoleId: roleId },
    });

    await maybeDeleteOrphanCustomRole(prevRoleId, organizationId);

    res.json({ success: true, organizationRoleId: roleId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.status(500).json({ success: false, error: msg });
  }
});

// PATCH /api/organization-roles/assign-member/membership?organizationId=... (before /:id)
router.patch("/assign-member/membership", async (req: Request, res: Response) => {
  try {
    const organizationId = (req.query.organizationId as string) || (req.body?.organizationId as string);
    const memberRowId = req.body?.memberRowId as string | undefined;
    const organizationRoleId = req.body?.organizationRoleId as string | undefined;
    if (!organizationId || !memberRowId || !organizationRoleId) {
      return res.status(400).json({ success: false, error: "organizationId, memberRowId, and organizationRoleId required" });
    }
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:roles:assign"]))) return;

    const targetRole = await prisma.organization_role.findFirst({
      where: { id: organizationRoleId, organizationId },
    });
    if (!targetRole) return res.status(404).json({ success: false, error: "Role not found" });
    if (targetRole.kind === ORG_ROLE_KIND.owner) {
      return res.status(400).json({ success: false, error: "Use ownership transfer to assign an owner" });
    }

    const row = await prisma.member.findFirst({ where: { id: memberRowId, organizationId } });
    if (!row) return res.status(404).json({ success: false, error: "Member not found" });
    if ((row.role || "").toLowerCase() === "owner") {
      return res.status(400).json({
        success: false,
        error: "Use Transfer ownership to change the workspace owner; you cannot reassign this member to another role here.",
      });
    }

    let newRoleStr = "member";
    if (targetRole.kind === ORG_ROLE_KIND.admin) newRoleStr = "admin";
    else newRoleStr = "member";

    await prisma.member.update({
      where: { id: memberRowId },
      data: { role: newRoleStr, organizationRoleId: targetRole.id },
    });

    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.json({ success: false, error: msg });
  }
});

// PATCH /api/organization-roles/:id?organizationId=...
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id as string;
    const organizationId = (req.query.organizationId as string) || (req.body?.organizationId as string);
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:roles:manage"]))) return;

    const existing = await prisma.organization_role.findFirst({
      where: { id: roleId, organizationId },
      include: { permissions: true },
    });
    if (!existing) return res.status(404).json({ success: false, error: "Role not found" });
    if (existing.kind !== ORG_ROLE_KIND.custom && existing.kind !== ORG_ROLE_KIND.member_template) {
      return res.status(400).json({ success: false, error: "Only custom or member template roles can be edited here" });
    }

    const body = req.body as { name?: string; color?: string; iconKey?: string; permissionIds?: string[] };
    const data: { name?: string; color?: string; iconKey?: string; updatedAt?: Date } = { updatedAt: new Date() };
    if (body.name !== undefined) data.name = body.name.trim().slice(0, 120);
    if (body.color !== undefined) data.color = body.color.trim().slice(0, 32);
    if (body.iconKey !== undefined) data.iconKey = body.iconKey.trim().slice(0, 64);

    if (body.permissionIds !== undefined) {
      const flags = await loadOrgFeatureFlags(organizationId);
      const stripped = filterPermissionIdsForOrgFeatures(body.permissionIds, flags);
      const v = validatePermissionSelection([...stripped]);
      if (!v.ok) return res.status(400).json({ success: false, error: v.error });
      const grantableOrg = getGrantablePermissionsSetForOrgFeatures(flags);
      const expanded = new Set([...expandPermissionSet(stripped)].filter((id) => grantableOrg.has(id)));
      if (expanded.size === 0) {
        return res.status(400).json({ success: false, error: "Select at least one permission for an enabled product" });
      }
      await prisma.organization_role_permission.deleteMany({ where: { roleId } });
      await prisma.organization_role_permission.createMany({
        data: [...expanded].map((permission) => ({ id: crypto.randomUUID(), roleId, permission })),
      });
    }

    await prisma.organization_role.update({ where: { id: roleId }, data });
    const updated = await prisma.organization_role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });
    res.json({ success: true, role: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.json({ success: false, error: msg });
  }
});

// DELETE /api/organization-roles/:id?organizationId=...
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id as string;
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:roles:manage"]))) return;

    const existing = await prisma.organization_role.findFirst({ where: { id: roleId, organizationId } });
    if (!existing) return res.status(404).json({ success: false, error: "Role not found" });
    if (existing.kind !== ORG_ROLE_KIND.custom) {
      return res.status(400).json({ success: false, error: "Only custom roles can be deleted" });
    }

    const inUse = await prisma.member.count({ where: { organizationRoleId: roleId } });
    if (inUse > 0) {
      return res.status(400).json({ success: false, error: "Role is assigned to members; reassign them first" });
    }

    await prisma.organization_role.delete({ where: { id: roleId } });
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.json({ success: false, error: msg });
  }
});

export { router as organizationRolesRouter };
