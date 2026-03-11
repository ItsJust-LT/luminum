import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { pathParam, queryParam } from "../lib/req-params.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
  next();
}

// GET /api/user-management/users
router.get("/users", adminOnly, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { member: { include: { organization: { select: { id: true, name: true, slug: true } } } }, _count: { select: { session: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, users });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/user-management/users/:id
router.get("/users/:id", adminOnly, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: pathParam(req, "id") },
      include: { member: { include: { organization: { select: { id: true, name: true, slug: true } } } }, session: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, user });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// PATCH /api/user-management/users/:id
router.patch("/users/:id", adminOnly, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({ where: { id: pathParam(req, "id")! }, data: req.body });
    res.json({ success: true, user });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/user-management/users/:id/deactivate
router.post("/users/:id/deactivate", adminOnly, async (req: Request, res: Response) => {
  try {
    await prisma.user.update({ where: { id: pathParam(req, "id")! }, data: { banned: true, banReason: req.body.reason || "Deactivated by admin" } });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/user-management/stats
router.get("/stats", adminOnly, async (_req: Request, res: Response) => {
  try {
    const [total, admins, banned, recentCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);
    res.json({ success: true, stats: { totalUsers: total, adminUsers: admins, bannedUsers: banned, recentUsers: recentCount } });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/user-management/paystack-payments?userId=...
router.get("/paystack-payments", adminOnly, async (req: Request, res: Response) => {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
    if (!PAYSTACK_SECRET) return res.json({ success: false, error: "PAYSTACK_SECRET not configured" });
    const user = await prisma.user.findUnique({ where: { id: queryParam(req, "userId")! }, select: { email: true } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    const resp = await fetch(`https://api.paystack.co/transaction?email=${encodeURIComponent(user.email)}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
    const data = (await resp.json()) as { data?: unknown[] };
    res.json({ success: true, transactions: data.data || [] });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as userManagementRouter };
