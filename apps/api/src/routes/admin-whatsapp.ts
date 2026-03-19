import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { getPathParam } from "../lib/req-params.js";
import { getLiveClientsForAdmin, disconnectClient, startOrRestartClient } from "../whatsapp/manager.js";
import { deleteAllOrgData } from "../whatsapp/redis-store.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: Request, res: Response, next: () => void) {
  if ((req as any).user?.role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

/** GET /api/admin/whatsapp/analytics — reads from whatsapp_analytics_daily table. */
router.get("/analytics", adminOnly, async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(String(req.query.days || "30"), 10)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalAccounts,
      connectedAccounts,
      aggregates,
      messagesByDay,
      messagesByOrg,
      inboundOutboundByDay,
    ] = await Promise.all([
      prisma.whatsapp_account.count(),
      prisma.whatsapp_account.count({ where: { status: "CONNECTED" } }),
      prisma.$queryRawUnsafe<{ total_sent: bigint; total_received: bigint; total_media_sent: bigint; total_media_received: bigint; sent_24h: bigint; received_24h: bigint; sent_7d: bigint; received_7d: bigint }[]>(
        `SELECT
           COALESCE(SUM(messages_sent), 0)::bigint AS total_sent,
           COALESCE(SUM(messages_received), 0)::bigint AS total_received,
           COALESCE(SUM(media_sent), 0)::bigint AS total_media_sent,
           COALESCE(SUM(media_received), 0)::bigint AS total_media_received,
           COALESCE(SUM(CASE WHEN day >= (CURRENT_DATE - INTERVAL '1 day') THEN messages_sent + messages_received ELSE 0 END), 0)::bigint AS sent_24h,
           COALESCE(SUM(CASE WHEN day >= (CURRENT_DATE - INTERVAL '1 day') THEN messages_received ELSE 0 END), 0)::bigint AS received_24h,
           COALESCE(SUM(CASE WHEN day >= (CURRENT_DATE - INTERVAL '7 days') THEN messages_sent + messages_received ELSE 0 END), 0)::bigint AS sent_7d,
           COALESCE(SUM(CASE WHEN day >= (CURRENT_DATE - INTERVAL '7 days') THEN messages_received ELSE 0 END), 0)::bigint AS received_7d
         FROM whatsapp_analytics_daily`,
      ),
      prisma.$queryRawUnsafe<{ day: Date; sent: bigint; received: bigint }[]>(
        `SELECT day, SUM(messages_sent)::bigint AS sent, SUM(messages_received)::bigint AS received
         FROM whatsapp_analytics_daily
         WHERE day >= $1::date
         GROUP BY day ORDER BY day ASC`,
        since,
      ),
      prisma.$queryRawUnsafe<{ organization_id: string; organization_name: string; total_messages: bigint; total_sent: bigint; total_received: bigint }[]>(
        `SELECT a.organization_id, o.name AS organization_name,
           (SUM(a.messages_sent) + SUM(a.messages_received))::bigint AS total_messages,
           SUM(a.messages_sent)::bigint AS total_sent,
           SUM(a.messages_received)::bigint AS total_received
         FROM whatsapp_analytics_daily a
         JOIN organization o ON o.id = a.organization_id
         WHERE a.day >= $1::date
         GROUP BY a.organization_id, o.name
         ORDER BY total_messages DESC LIMIT 50`,
        since,
      ),
      prisma.$queryRawUnsafe<{ day: Date; sent: bigint; received: bigint; media_sent: bigint; media_received: bigint }[]>(
        `SELECT day,
           SUM(messages_sent)::bigint AS sent,
           SUM(messages_received)::bigint AS received,
           SUM(media_sent)::bigint AS media_sent,
           SUM(media_received)::bigint AS media_received
         FROM whatsapp_analytics_daily
         WHERE day >= $1::date
         GROUP BY day ORDER BY day ASC`,
        since,
      ),
    ]);

    const agg = aggregates[0] ?? { total_sent: 0n, total_received: 0n, total_media_sent: 0n, total_media_received: 0n, sent_24h: 0n, received_24h: 0n, sent_7d: 0n, received_7d: 0n };

    res.json({
      success: true,
      analytics: {
        totalAccounts,
        connectedAccounts,
        totalMessages: Number(agg.total_sent) + Number(agg.total_received),
        totalSent: Number(agg.total_sent),
        totalReceived: Number(agg.total_received),
        totalMediaSent: Number(agg.total_media_sent),
        totalMediaReceived: Number(agg.total_media_received),
        messagesLast24h: Number(agg.sent_24h),
        messagesLast7d: Number(agg.sent_7d),
        messagesByDay: (messagesByDay as any[]).map((r) => ({
          day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
          sent: Number(r.sent),
          received: Number(r.received),
          count: Number(r.sent) + Number(r.received),
        })),
        messagesByOrg: (messagesByOrg as any[]).map((r) => ({
          organizationId: r.organization_id,
          organizationName: r.organization_name,
          messageCount: Number(r.total_messages),
          sentCount: Number(r.total_sent),
          receivedCount: Number(r.total_received),
        })),
        inboundOutboundByDay: (inboundOutboundByDay as any[]).map((r) => ({
          day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
          sent: Number(r.sent),
          received: Number(r.received),
          mediaSent: Number(r.media_sent),
          mediaReceived: Number(r.media_received),
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to load analytics" });
  }
});

/** GET /api/admin/whatsapp/clients */
router.get("/clients", adminOnly, async (_req: Request, res: Response) => {
  try {
    const live = await getLiveClientsForAdmin();
    res.json({ success: true, clients: live });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to load clients" });
  }
});

/** POST /api/admin/whatsapp/clients/:organizationId/shutdown */
router.post("/clients/:organizationId/shutdown", adminOnly, async (req: Request, res: Response) => {
  try {
    const organizationId = getPathParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await disconnectClient(organizationId);
    res.json({ success: true, message: "Client shutdown" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to shutdown client" });
  }
});

/** POST /api/admin/whatsapp/clients/:organizationId/always-on */
router.post("/clients/:organizationId/always-on", adminOnly, async (req: Request, res: Response) => {
  try {
    const organizationId = getPathParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    const enabled = !!(req.body as { enabled?: unknown })?.enabled;
    await prisma.organization.update({ where: { id: organizationId }, data: { whatsapp_always_on: enabled } as any });
    if (enabled) await startOrRestartClient(organizationId); else await disconnectClient(organizationId);
    res.json({ success: true, organizationId, alwaysOn: enabled });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to update always-on setting" });
  }
});

/** POST /api/admin/whatsapp/remove-all */
router.post("/remove-all", adminOnly, async (_req: Request, res: Response) => {
  try {
    const accounts = await prisma.whatsapp_account.findMany({ select: { organization_id: true } });
    const orgIds = [...new Set(accounts.map((a) => a.organization_id))];
    for (const orgId of orgIds) {
      await disconnectClient(orgId);
      await deleteAllOrgData(orgId).catch(() => {});
    }
    await prisma.whatsapp_account.deleteMany({});
    res.json({ success: true, message: "All WhatsApp data removed. Accounts and Redis cache have been cleared." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to remove WhatsApp data" });
  }
});

export { router as adminWhatsappRouter };
