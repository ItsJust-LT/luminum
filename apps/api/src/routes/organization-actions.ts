import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { sendOrganizationInvitationEmail, sendMemberRemovalEmail } from "../lib/email.js";
import { notifyMemberJoined, notifyMemberLeft, notifyMemberInvited, notifyInvitationAccepted } from "../lib/notifications/helpers.js";
import { auth } from "../auth/config.js";

const router = Router();

// GET /api/organization-actions/invitation/:id (no auth needed for checking)
router.get("/invitation/:id", async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    const invitation = await prisma.invitation.findUnique({
      where: { id, status: "pending" },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found or expired" });
    const inv = invitation as typeof invitation & { organization?: { name?: string } };
    if (new Date(invitation.expiresAt) < new Date()) return res.status(400).json({ success: false, error: "Invitation expired" });

    res.json({
      success: true,
      invitation: { ...invitation, role: invitation.role || "member", expiresAt: invitation.expiresAt.toISOString(), createdAt: invitation.createdAt.toISOString(), organizationName: inv.organization?.name || "the organization" },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/check-user
router.post("/check-user", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
    res.json({ success: true, exists: !!user, user: user || null });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// Remaining routes require auth
router.use(requireAuth);

// POST /api/organization-actions/send-invitation
router.post("/send-invitation", async (req: Request, res: Response) => {
  try {
    const { email, role, organizationId, organizationName } = req.body;
    const userCheck = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(), email, role: role || "member", organizationId,
        inviterId: req.user.id, status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date(),
      },
    });

    const APP_URL = process.env.APP_URL || "http://localhost:3000";
    const inviteLink = `${APP_URL}/accept-org-invitation/${invitation.id}`;
    await sendOrganizationInvitationEmail({ email, role: role || "member", organizationName, inviteLink, invitedByUsername: req.user.name || "Someone", invitedByEmail: req.user.email, userExists: !!userCheck });
    await notifyMemberInvited(organizationId, email, role, req.user.name || "Someone");

    res.json({ success: true, invitation });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/accept-invitation
router.post("/accept-invitation", async (req: Request, res: Response) => {
  try {
    const { invitationId, name, email, password } = req.body;
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId, status: "pending" } });
    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found" });
    if (new Date(invitation.expiresAt) < new Date()) return res.status(400).json({ success: false, error: "Invitation expired" });

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const result = await auth.api.signUpEmail({ body: { name, email, password } });
      if (!result?.user) return res.status(400).json({ success: false, error: "Failed to create user" });
      userId = result.user.id;
    }

    try { await prisma.invitation.update({ where: { id: invitationId }, data: { status: "accepted" } }); } catch {}
    await notifyInvitationAccepted(invitation.organizationId, name, email);

    res.json({ success: true, user: { id: userId, email, name } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/remove-member
router.post("/remove-member", async (req: Request, res: Response) => {
  try {
    const { memberId, memberEmail, memberName, organizationName, organizationId } = req.body;
    const membership = await prisma.member.findFirst({ where: { userId: req.user.id, organizationId }, select: { role: true } });
    if (!membership || !["admin", "owner"].includes(membership.role)) return res.status(403).json({ success: false, error: "Insufficient permissions" });

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
    const membership = await prisma.member.findFirst({ where: { userId: req.user.id, organizationId }, select: { role: true } });
    if (!membership || !["admin", "owner"].includes(membership.role)) return res.status(403).json({ success: false, error: "Insufficient permissions" });

    const invitations = await prisma.invitation.findMany({
      where: { organizationId, status: "pending" },
      select: { id: true, email: true, role: true, status: true, createdAt: true, expiresAt: true, inviterId: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, invitations: invitations.map(i => ({ ...i, role: i.role || "member", createdAt: i.createdAt.toISOString(), expiresAt: i.expiresAt.toISOString() })) });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/cancel-invitation
router.post("/cancel-invitation", async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.body;
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId, status: "pending" }, select: { id: true, organizationId: true } });
    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found" });

    const membership = await prisma.member.findFirst({ where: { userId: req.user.id, organizationId: invitation.organizationId }, select: { role: true } });
    if (!membership || !["admin", "owner"].includes(membership.role)) return res.status(403).json({ success: false, error: "Insufficient permissions" });

    await prisma.invitation.update({ where: { id: invitationId }, data: { status: "cancelled" } });
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-actions/add-member
router.post("/add-member", async (req: Request, res: Response) => {
  try {
    const { email, role, organizationId } = req.body;
    const membership = await prisma.member.findFirst({ where: { userId: req.user.id, organizationId }, select: { role: true } });
    if (!membership || !["admin", "owner"].includes(membership.role)) return res.status(403).json({ success: false, error: "Insufficient permissions" });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const existingMember = await prisma.member.findFirst({ where: { userId: user.id, organizationId } });
    if (existingMember) return res.status(400).json({ success: false, error: "User is already a member" });

    await prisma.member.create({ data: { id: crypto.randomUUID(), userId: user.id, organizationId, role, createdAt: new Date() } });
    await notifyMemberJoined(organizationId, user.name, email, role);

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// PATCH /api/organization-actions/update-role
router.patch("/update-role", async (req: Request, res: Response) => {
  try {
    const { memberId, newRole, organizationId } = req.body;
    const membership = await prisma.member.findFirst({ where: { userId: req.user.id, organizationId }, select: { role: true } });
    if (!membership || !["admin", "owner"].includes(membership.role)) return res.status(403).json({ success: false, error: "Insufficient permissions" });

    await prisma.member.update({ where: { id: memberId }, data: { role: newRole } });
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as organizationActionsRouter };
