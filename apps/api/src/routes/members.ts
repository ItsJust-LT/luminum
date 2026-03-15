import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization } from "../lib/access.js";

const router = Router();
router.use(requireAuth);

// GET /api/members?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ data: [], error: "Access denied" });
    const members = await prisma.member.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: members, error: null });
  } catch (error: any) { res.json({ data: [], error: error.message }); }
});

export { router as membersRouter };
