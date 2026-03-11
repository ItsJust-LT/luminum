import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);

// GET /api/members?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const members = await prisma.member.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: members, error: null });
  } catch (error: any) { res.json({ data: [], error: error.message }); }
});

export { router as membersRouter };
