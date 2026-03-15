import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { jsonStringifySafe } from "../lib/json-safe.js";
import { notifyAdminsOrganizationDeleted } from "../lib/notifications/helpers.js";

const router = Router();
router.use(requireAuth);

/** Send JSON with BigInt serialized as string */
function jsonSafe(res: Response, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.send(jsonStringifySafe(data));
}

// GET /api/organization-management?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } } }, websites: true, subscriptions_subscriptions_organization_idToorganization: true } });
    if (!org) return res.status(404).json({ success: false, error: "Not found" });
    jsonSafe(res, { success: true, data: org });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// PATCH /api/organization-management?organizationId=...
router.patch("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
    await prisma.organization.update({ where: { id: organizationId }, data: req.body });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// DELETE /api/organization-management?organizationId=...
router.delete("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    await prisma.organization.delete({ where: { id: organizationId } });
    if (org) await notifyAdminsOrganizationDeleted(org.name, organizationId);
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/organization-management/stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
    const [totalOrgs, totalMembers, totalWebsites] = await Promise.all([
      prisma.organization.count(),
      prisma.member.count(),
      prisma.websites.count(),
    ]);
    res.json({ success: true, stats: { totalOrgs, totalMembers, totalWebsites } });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as organizationManagementRouter };
