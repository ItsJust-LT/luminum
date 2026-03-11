import { Router, Request, Response } from "express";
import { pathParam } from "../lib/req-params.js";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);

// POST /api/user-notifications/push-subscription
router.post("/push-subscription", async (req: Request, res: Response) => {
  try {
    const subscription = req.body;
    const endpoint = subscription?.endpoint;
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

    const existing = await prisma.device_subscriptions.findFirst({ where: { user_id: req.user.id, device_id: endpoint } });
    if (existing) {
      await prisma.device_subscriptions.update({ where: { id: existing.id }, data: { subscription } });
    } else {
      await prisma.device_subscriptions.create({ data: { user_id: req.user.id, device_id: endpoint, subscription } });
    }
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// DELETE /api/user-notifications/push-subscription
router.delete("/push-subscription", async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    await prisma.device_subscriptions.deleteMany({ where: { user_id: req.user.id, device_id: endpoint } });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/user-notifications?cursor=...&limit=20
router.get("/", async (req: Request, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const where: any = { user_id: req.user.id };
    if (cursor) where.created_at = { lt: new Date(cursor) };

    const items = await prisma.notifications.findMany({ where, orderBy: { created_at: "desc" }, take: limit });
    const lastItem = items[items.length - 1];
    const nextCursor = items.length === limit && lastItem?.created_at ? lastItem.created_at.toISOString() : null;
    const formatted = items.map(item => ({ ...item, user_id: item.user_id ?? undefined, created_at: item.created_at?.toISOString() || new Date().toISOString(), title: item.title ?? undefined, message: item.message ?? undefined, read: item.read ?? false, data: item.data && typeof item.data === "object" ? item.data : {} }));
    res.json({ items: formatted, nextCursor });
  } catch (error: any) { res.json({ items: [], nextCursor: null }); }
});

// GET /api/user-notifications/unread-count
router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const count = await prisma.notifications.count({ where: { user_id: req.user.id, read: false } });
    res.json({ unread: count });
  } catch { res.json({ unread: 0 }); }
});

// POST /api/user-notifications/:id/read
router.post("/:id/read", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    await prisma.notifications.updateMany({ where: { user_id: req.user.id, id }, data: { read: true } });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/user-notifications/read-all
router.post("/read-all", async (req: Request, res: Response) => {
  try {
    await prisma.notifications.updateMany({ where: { user_id: req.user.id, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/user-notifications/mark-email-read
router.post("/mark-email-read", async (req: Request, res: Response) => {
  try {
    const { emailId } = req.body;
    const notifications = await prisma.notifications.findMany({ where: { user_id: req.user.id, read: false }, select: { id: true, data: true } });
    const matchingIds = notifications.filter((n: any) => (n.data as any)?.emailId === emailId).map(n => n.id);
    if (matchingIds.length > 0) await prisma.notifications.updateMany({ where: { id: { in: matchingIds } }, data: { read: true } });
    res.json({ success: true, count: matchingIds.length });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/user-notifications/mark-form-read
router.post("/mark-form-read", async (req: Request, res: Response) => {
  try {
    const { formSubmissionId } = req.body;
    const notifications = await prisma.notifications.findMany({ where: { user_id: req.user.id, read: false }, select: { id: true, data: true } });
    const matchingIds = notifications.filter((n: any) => (n.data as any)?.formSubmissionId === formSubmissionId).map(n => n.id);
    if (matchingIds.length > 0) await prisma.notifications.updateMany({ where: { id: { in: matchingIds } }, data: { read: true } });
    res.json({ success: true, count: matchingIds.length });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/user-notifications/org-id-by-slug?slug=...
router.get("/org-id-by-slug", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: req.query.slug as string }, select: { id: true } });
    res.json({ organizationId: org?.id || null });
  } catch { res.json({ organizationId: null }); }
});

export { router as notificationsRouter };
