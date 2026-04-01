import { Router, Request, Response } from "express";
import { pathParam } from "../lib/req-params.js";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { broadcastToUser } from "../lib/realtime-ws.js";

const router = Router();
router.use(requireAuth);

function asDataRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function formatNotificationRow(item: {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  dedupe_key: string | null;
  type: string;
  title: string | null;
  message: string | null;
  data: unknown;
  read: boolean | null;
  created_at: Date | null;
}) {
  const base = asDataRecord(item.data);
  const actions = Array.isArray(base.actions) ? base.actions : [];
  const iconKey =
    typeof base.iconKey === "string" ? base.iconKey : undefined;
  const organizationId =
    item.organization_id ??
    (typeof base.organizationId === "string"
      ? base.organizationId
      : undefined);
  return {
    ...item,
    user_id: item.user_id ?? undefined,
    organization_id: item.organization_id ?? undefined,
    dedupe_key: item.dedupe_key ?? undefined,
    created_at: item.created_at?.toISOString() || new Date().toISOString(),
    title: item.title ?? undefined,
    message: item.message ?? undefined,
    read: item.read ?? false,
    data: base,
    organizationId,
    dedupeKey: item.dedupe_key ?? undefined,
    actions,
    iconKey,
  };
}

async function markEmailNotificationsByEmailId(
  userId: string,
  emailId: string
): Promise<string[]> {
  const notifications = await prisma.notifications.findMany({
    where: { user_id: userId, read: false },
    select: { id: true, data: true },
  });
  const matchingIds = notifications
    .filter((n) => (asDataRecord(n.data).emailId as string | undefined) === emailId)
    .map((n) => n.id);
  if (matchingIds.length > 0) {
    await prisma.notifications.updateMany({
      where: { id: { in: matchingIds } },
      data: { read: true },
    });
  }
  return matchingIds;
}

async function markFormNotificationsBySubmissionId(
  userId: string,
  formSubmissionId: string
): Promise<string[]> {
  const notifications = await prisma.notifications.findMany({
    where: { user_id: userId, read: false },
    select: { id: true, data: true },
  });
  const matchingIds = notifications
    .filter(
      (n) =>
        (asDataRecord(n.data).formSubmissionId as string | undefined) ===
        formSubmissionId
    )
    .map((n) => n.id);
  if (matchingIds.length > 0) {
    await prisma.notifications.updateMany({
      where: { id: { in: matchingIds } },
      data: { read: true },
    });
  }
  return matchingIds;
}

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

// GET /api/user-notifications?cursor=...&limit=20&organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const organizationId = req.query.organizationId as string | undefined;
    const where: Record<string, unknown> = { user_id: req.user.id };
    if (cursor) where.created_at = { lt: new Date(cursor) };
    if (organizationId) where.organization_id = organizationId;

    const items = await prisma.notifications.findMany({ where, orderBy: { created_at: "desc" }, take: limit });
    const lastItem = items[items.length - 1];
    const nextCursor = items.length === limit && lastItem?.created_at ? lastItem.created_at.toISOString() : null;
    const formatted = items.map(formatNotificationRow);
    res.json({ items: formatted, nextCursor });
  } catch (error: any) { res.json({ items: [], nextCursor: null }); }
});

// GET /api/user-notifications/unread-count
router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;
    const where: Record<string, unknown> = { user_id: req.user.id, read: false };
    if (organizationId) where.organization_id = organizationId;
    const count = await prisma.notifications.count({ where });
    res.json({ unread: count });
  } catch { res.json({ unread: 0 }); }
});

// POST /api/user-notifications/:id/action
router.post("/:id/action", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const actionId = req.body?.actionId as string | undefined;
    if (!actionId) return res.status(400).json({ success: false, error: "Missing actionId" });

    const row = await prisma.notifications.findFirst({
      where: { id, user_id: req.user.id },
    });
    if (!row) return res.status(404).json({ success: false, error: "Not found" });

    const data = asDataRecord(row.data);
    const actions = Array.isArray(data.actions) ? data.actions : [];
    const allowed = actions.some(
      (a: { id?: string }) => a && typeof a === "object" && a.id === actionId
    );
    if (!allowed) return res.status(400).json({ success: false, error: "Invalid action" });

    if (actionId === "mark_email_read" && row.type === "email_received") {
      const emailId = data.emailId as string | undefined;
      if (!emailId) return res.status(400).json({ success: false, error: "Missing email context" });
      const ids = await markEmailNotificationsByEmailId(req.user.id, emailId);
      broadcastToUser(req.user.id, { type: "notification:read", data: { ids } });
      return res.json({ success: true, ids });
    }

    if (actionId === "mark_form_read" && row.type === "form_submission") {
      const formSubmissionId = data.formSubmissionId as string | undefined;
      if (!formSubmissionId)
        return res.status(400).json({ success: false, error: "Missing form context" });
      const ids = await markFormNotificationsBySubmissionId(
        req.user.id,
        formSubmissionId
      );
      broadcastToUser(req.user.id, { type: "notification:read", data: { ids } });
      return res.json({ success: true, ids });
    }

    return res.status(400).json({ success: false, error: "Unsupported action" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/user-notifications/:id/read
router.post("/:id/read", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    await prisma.notifications.updateMany({ where: { user_id: req.user.id, id }, data: { read: true } });
    broadcastToUser(req.user.id, { type: "notification:read", data: { id } });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/user-notifications/read-all
router.post("/read-all", async (req: Request, res: Response) => {
  try {
    await prisma.notifications.updateMany({ where: { user_id: req.user.id, read: false }, data: { read: true } });
    broadcastToUser(req.user.id, { type: "notification:read", data: { all: true } });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/user-notifications/mark-email-read
router.post("/mark-email-read", async (req: Request, res: Response) => {
  try {
    const { emailId } = req.body;
    const matchingIds = await markEmailNotificationsByEmailId(req.user.id, emailId);
    if (matchingIds.length > 0) {
      broadcastToUser(req.user.id, { type: "notification:read", data: { ids: matchingIds } });
    }
    res.json({ success: true, count: matchingIds.length });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/user-notifications/mark-form-read
router.post("/mark-form-read", async (req: Request, res: Response) => {
  try {
    const { formSubmissionId } = req.body;
    const matchingIds = await markFormNotificationsBySubmissionId(
      req.user.id,
      formSubmissionId
    );
    if (matchingIds.length > 0) {
      broadcastToUser(req.user.id, { type: "notification:read", data: { ids: matchingIds } });
    }
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
