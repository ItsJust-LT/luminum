import { Router, Request, Response } from "express";
import { requireAuth, optionalAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { getMemberOrAdmin } from "../lib/access.js";
import { requireOrgPermissions } from "../lib/org-permission-http.js";
import { ensureBuiltinRolesForOrganization } from "../lib/org-roles-seed.js";
import { ORG_ROLE_KIND } from "@luminum/org-permissions";
import { sendOrganizationInvitationEmail, sendMemberRemovalEmail } from "../lib/email.js";
import { notifyMemberJoined, notifyMemberLeft, notifyMemberInvited, notifyInvitationAccepted } from "../lib/notifications/helpers.js";
import { auth } from "../auth/config.js";
import { createOwnershipTransferInvitation } from "../lib/ownership-transfer-invite.js";

const router = Router();

// GET /api/organization-actions/invitation/:id (no auth needed for checking)
router.get("/invitation/:id", async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    const invitation = await prisma.invitation.findFirst({
      where: { id, status: "pending" },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found or expired" });
    const inv = invitation as typeof invitation & { organization?: { name?: string; slug?: string } };
    if (new Date(invitation.expiresAt) < new Date()) return res.status(400).json({ success: false, error: "Invitation expired" });

    res.json({
      success: true,
      invitation: {
        ...invitation,
        role: invitation.role || "member",
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        organizationName: inv.organization?.name || "the organization",
        organizationSlug: inv.organization?.slug || "",
        ownershipTransfer: !!invitation.ownership_transfer,
      },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/check-user
router.post("/check-user", async (req: Request, res: Response) => {
  try {
    const raw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const user = raw
      ? await prisma.user.findUnique({ where: { email: raw }, select: { id: true, email: true, name: true } })
      : null;
    res.json({ success: true, exists: !!user, user: user || null });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * Complete ownership transfer (pending invitation with ownership_transfer).
 * Optional session: if logged in, session email must match the invitation (e.g. Google callback).
 * Otherwise name + email + password for new accounts; existing accounts matched by email without extra verification (same as accept-invitation).
 */
router.post("/accept-ownership-transfer", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { invitationId, name, email, password } = req.body as {
      invitationId?: string;
      name?: string;
      email?: string;
      password?: string;
    };
    if (!invitationId || typeof invitationId !== "string") {
      return res.status(400).json({ success: false, error: "invitationId is required" });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, status: "pending", ownership_transfer: true },
      include: { organization: { select: { slug: true, name: true } } },
    });
    if (!invitation) {
      return res.status(404).json({ success: false, error: "Transfer invitation not found or already used" });
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: "Invitation expired" });
    }

    const invEmail = invitation.email.trim().toLowerCase();
    let userId: string;
    let userName = typeof name === "string" ? name.trim() : "";
    const userEmail = invEmail;

    if (req.user?.id) {
      const sessionEmail = (req.user.email || "").trim().toLowerCase();
      if (sessionEmail !== invEmail) {
        return res.status(403).json({ success: false, error: "Sign in with the email address this invitation was sent to" });
      }
      userId = req.user.id;
      userName = userName || (req.user.name as string) || "User";
    } else {
      const bodyEmail = (email || "").trim().toLowerCase();
      if (!bodyEmail || bodyEmail !== invEmail) {
        return res.status(400).json({ success: false, error: "Email must match the invitation" });
      }
      const existingUser = await prisma.user.findUnique({ where: { email: invEmail }, select: { id: true, name: true } });
      if (existingUser) {
        userId = existingUser.id;
        userName = userName || existingUser.name || "User";
      } else {
        if (!password || typeof password !== "string") {
          return res.status(400).json({ success: false, error: "Password is required to create your account" });
        }
        if (!userName) return res.status(400).json({ success: false, error: "Name is required" });
        const result = await auth.api.signUpEmail({ body: { name: userName, email: invEmail, password } });
        if (!result?.user) return res.status(400).json({ success: false, error: "Failed to create user" });
        userId = result.user.id;
      }
    }

    const orgId = invitation.organizationId;
    const slug = invitation.organization?.slug || "";

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: "accepted" },
      });
      await tx.member.updateMany({
        where: { organizationId: orgId, role: "owner" },
        data: { role: "admin" },
      });
      const existingMember = await tx.member.findFirst({
        where: { organizationId: orgId, userId },
      });
      if (existingMember) {
        await tx.member.update({
          where: { id: existingMember.id },
          data: { role: "owner" },
        });
      } else {
        await tx.member.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: orgId,
            userId,
            role: "owner",
            createdAt: new Date(),
          },
        });
      }
    });

    await notifyInvitationAccepted(orgId, userName, userEmail);

    res.json({
      success: true,
      user: { id: userId, email: userEmail, name: userName },
      organizationSlug: slug,
      ownershipTransferCompleted: true,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/accept-invitation (no auth; used before user may have org session)
router.post("/accept-invitation", async (req: Request, res: Response) => {
  try {
    const { invitationId, name, email, password } = req.body;
    const invitation = await prisma.invitation.findFirst({ where: { id: invitationId, status: "pending" } });
    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found" });
    if (invitation.ownership_transfer) {
      return res.status(400).json({
        success: false,
        error: "This is an ownership transfer. Use the ownership transfer acceptance flow.",
      });
    }
    if (new Date(invitation.expiresAt) < new Date()) return res.status(400).json({ success: false, error: "Invitation expired" });

    const invEmail = invitation.email.trim().toLowerCase();
    const bodyEmail = (email || "").trim().toLowerCase();
    if (!bodyEmail || bodyEmail !== invEmail) {
      return res.status(400).json({ success: false, error: "Email must match the invitation" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invEmail }, select: { id: true } });
    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const result = await auth.api.signUpEmail({ body: { name, email: invEmail, password } });
      if (!result?.user) return res.status(400).json({ success: false, error: "Failed to create user" });
      userId = result.user.id;
    }

    try {
      await prisma.invitation.update({ where: { id: invitationId }, data: { status: "accepted" } });
    } catch {}
    await notifyInvitationAccepted(invitation.organizationId, name, invEmail);

    res.json({ success: true, user: { id: userId, email: invEmail, name }, existingUser: !!existingUser });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// Remaining routes require auth
router.use(requireAuth);

// POST /api/organization-actions/request-ownership-transfer
router.post("/request-ownership-transfer", async (req: Request, res: Response) => {
  try {
    const { organizationId, email } = req.body as { organizationId?: string; email?: string };
    if (!organizationId || !email) {
      return res.status(400).json({ success: false, error: "organizationId and email are required" });
    }

    const orgOwner = await prisma.member.findFirst({
      where: { organizationId, userId: req.user.id, role: "owner" },
    });
    const isPlatformAdmin = req.user.role === "admin";
    if (!orgOwner && !isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        error: "Only the organization owner or a platform admin can transfer ownership",
      });
    }

    const created = await createOwnershipTransferInvitation({
      organizationId,
      emailRaw: email,
      inviterId: req.user.id,
      inviterName: req.user.name || req.user.email || "Administrator",
    });
    if (!created.ok) {
      return res.status(created.status).json({ success: false, error: created.error });
    }

    await notifyMemberInvited(organizationId, email.trim().toLowerCase(), "owner (transfer)", req.user.name || "Someone");

    res.json({ success: true, invitationId: created.invitationId });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/send-invitation
router.post("/send-invitation", async (req: Request, res: Response) => {
  try {
    const { email, role, organizationId, organizationName, organizationRoleId: bodyOrgRoleId } = req.body as {
      email?: string;
      role?: string;
      organizationId?: string;
      organizationName?: string;
      organizationRoleId?: string;
    };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId is required" });
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:invite"]))) return;

    await ensureBuiltinRolesForOrganization(prisma, organizationId);

    let r = (role || "member").toLowerCase();
    let organizationRoleId: string | null = typeof bodyOrgRoleId === "string" ? bodyOrgRoleId : null;
    if (organizationRoleId) {
      const orole = await prisma.organization_role.findFirst({
        where: { id: organizationRoleId, organizationId },
      });
      if (!orole) return res.status(400).json({ success: false, error: "Invalid organization role" });
      if (orole.kind === ORG_ROLE_KIND.owner) {
        return res.status(400).json({
          success: false,
          error: "To change organization owner, use Transfer ownership instead of a normal invite.",
        });
      }
      r = orole.kind === ORG_ROLE_KIND.admin ? "admin" : "member";
    }
    if (r === "owner") {
      return res.status(400).json({
        success: false,
        error: "To change organization owner, use Transfer ownership instead of a normal invite.",
      });
    }

    const normalized = (email || "").trim().toLowerCase();
    if (!normalized) return res.status(400).json({ success: false, error: "Email is required" });

    const userCheck = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });

    if (!organizationRoleId) {
      const kind = r === "admin" ? ORG_ROLE_KIND.admin : ORG_ROLE_KIND.member_template;
      const orow = await prisma.organization_role.findFirst({ where: { organizationId, kind } });
      organizationRoleId = orow?.id ?? null;
    }

    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        email: normalized,
        role: r || "member",
        organizationId,
        inviterId: req.user.id,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ownership_transfer: false,
        organizationRoleId,
      },
    });

    const APP_URL = process.env.APP_URL || "http://localhost:3000";
    const inviteLink = `${APP_URL}/accept-org-invitation/${invitation.id}`;
    const inviteRole = r === "admin" ? ("admin" as const) : ("member" as const);
    await sendOrganizationInvitationEmail({
      email: normalized,
      role: inviteRole,
      organizationName: organizationName || "Organization",
      inviteLink,
      invitedByUsername: req.user.name || "Someone",
      invitedByEmail: req.user.email || "",
      userExists: !!userCheck,
    });
    await notifyMemberInvited(organizationId, normalized, r, req.user.name || "Someone");

    res.json({ success: true, invitation });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/remove-member
router.post("/remove-member", async (req: Request, res: Response) => {
  try {
    const { memberId, memberEmail, memberName, organizationName, organizationId } = req.body;
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:remove"]))) return;

    await prisma.member.deleteMany({ where: { userId: memberId, organizationId } });
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    try { await sendMemberRemovalEmail({ memberName, memberEmail, organizationName, removedBy: currentUser?.name || "An administrator" }); } catch {}
    await notifyMemberLeft(organizationId, memberName, memberEmail);

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/organization-actions/invitations?organizationId=...
router.get("/invitations", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:read"]))) return;

    const invitations = await prisma.invitation.findMany({
      where: { organizationId, status: "pending" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        inviterId: true,
        ownership_transfer: true,
        organizationRoleId: true,
        organization_role: { select: { id: true, name: true, color: true, iconKey: true, kind: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      success: true,
      invitations: invitations.map((i) => ({
        ...i,
        role: i.role || "member",
        ownershipTransfer: !!i.ownership_transfer,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
      })),
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/cancel-invitation
router.post("/cancel-invitation", async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.body;
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, status: "pending" },
      select: { id: true, organizationId: true },
    });
    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found" });

    if (!(await requireOrgPermissions(invitation.organizationId, req.user, res, ["team:invite"]))) return;

    await prisma.invitation.update({ where: { id: invitationId }, data: { status: "cancelled" } });
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/add-member
router.post("/add-member", async (req: Request, res: Response) => {
  try {
    const { email, role, organizationId, organizationRoleId: bodyOrgRoleId } = req.body as {
      email?: string;
      role?: string;
      organizationId?: string;
      organizationRoleId?: string;
    };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId is required" });
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:invite"]))) return;

    await ensureBuiltinRolesForOrganization(prisma, organizationId);

    let r = (role || "member").toLowerCase();
    let organizationRoleId: string | null = typeof bodyOrgRoleId === "string" ? bodyOrgRoleId : null;
    if (organizationRoleId) {
      const orole = await prisma.organization_role.findFirst({
        where: { id: organizationRoleId, organizationId },
      });
      if (!orole) return res.status(400).json({ success: false, error: "Invalid organization role" });
      if (orole.kind === ORG_ROLE_KIND.owner) {
        return res.status(400).json({
          success: false,
          error: "Use Transfer ownership to assign a new owner by email.",
        });
      }
      r = orole.kind === ORG_ROLE_KIND.admin ? "admin" : "member";
    }
    if (r === "owner") {
      return res.status(400).json({
        success: false,
        error: "Use Transfer ownership to assign a new owner by email.",
      });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const existingMember = await prisma.member.findFirst({ where: { userId: user.id, organizationId } });
    if (existingMember) return res.status(400).json({ success: false, error: "User is already a member" });

    if (!organizationRoleId) {
      const kind = r === "admin" ? ORG_ROLE_KIND.admin : ORG_ROLE_KIND.member_template;
      const orow = await prisma.organization_role.findFirst({ where: { organizationId, kind } });
      organizationRoleId = orow?.id ?? null;
    }

    const memberRole = r === "admin" ? ("admin" as const) : ("member" as const);
    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId,
        role: memberRole,
        createdAt: new Date(),
        organizationRoleId,
      },
    });
    await notifyMemberJoined(organizationId, user.name, email ?? "", r);

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// PATCH /api/organization-actions/update-role
router.patch("/update-role", async (req: Request, res: Response) => {
  try {
    const { memberId, newRole, organizationId, organizationRoleId: bodyOrgRoleId } = req.body as {
      memberId?: string;
      newRole?: string;
      organizationId?: string;
      organizationRoleId?: string;
    };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId is required" });
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:roles:assign"]))) return;

    await ensureBuiltinRolesForOrganization(prisma, organizationId);

    const row = await prisma.member.findFirst({ where: { id: memberId, organizationId } });
    if (!row) return res.status(404).json({ success: false, error: "Member not found" });

    if (typeof bodyOrgRoleId === "string" && bodyOrgRoleId) {
      const orole = await prisma.organization_role.findFirst({
        where: { id: bodyOrgRoleId, organizationId },
      });
      if (!orole) return res.status(400).json({ success: false, error: "Invalid organization role" });
      if (orole.kind === ORG_ROLE_KIND.owner) {
        return res.status(400).json({ success: false, error: "Use ownership transfer to assign an owner" });
      }
      const r = orole.kind === ORG_ROLE_KIND.admin ? "admin" : "member";
      await prisma.member.update({ where: { id: memberId }, data: { role: r, organizationRoleId: orole.id } });
      res.json({ success: true });
      return;
    }

    const nr = (newRole || "member").toLowerCase();
    if (nr === "owner") return res.status(400).json({ success: false, error: "Use ownership transfer to assign an owner" });
    const kind = nr === "admin" ? ORG_ROLE_KIND.admin : ORG_ROLE_KIND.member_template;
    const orow = await prisma.organization_role.findFirst({ where: { organizationId, kind } });
    await prisma.member.update({
      where: { id: memberId },
      data: { role: nr, organizationRoleId: orow?.id ?? row.organizationRoleId },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as organizationActionsRouter };
