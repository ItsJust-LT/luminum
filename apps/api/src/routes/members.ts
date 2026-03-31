import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { requireOrgPermissions } from "../lib/org-permission-http.js";
import { resolveOrgMemberPermissions } from "../lib/org-permissions-resolve.js";

const router = Router();
router.use(requireAuth);

/** GET /api/members/access?organizationId= — current user's permissions + role display (membership only; no org:settings:read). */
router.get("/access", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: "organizationId required" });
    }
    const resolved = await resolveOrgMemberPermissions(prisma, organizationId, req.user!);
    if (!resolved) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const roleDisplay = resolved.organizationRole;
    res.json({
      success: true,
      permissions: [...resolved.effectivePermissions],
      organizationRoleId: roleDisplay?.id ?? null,
      organizationRole: roleDisplay,
      memberRoleString: resolved.memberRoleString,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/members?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!(await requireOrgPermissions(organizationId, req.user, res, ["team:read"]))) return;
    const members = await prisma.member.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        organization_role: { select: { id: true, name: true, color: true, iconKey: true, kind: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: members, error: null });
  } catch (error: any) { res.json({ data: [], error: error.message }); }
});

export { router as membersRouter };
