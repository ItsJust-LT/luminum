import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { getPathParam } from "../lib/req-params.js";
import { getLiveClientsForAdmin, disconnectClient, startOrRestartClient } from "../whatsapp/manager.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: Request, res: Response, next: () => void) {
  if ((req as any).user?.role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

/** GET /api/admin/whatsapp/analytics — usage analytics (messages, chats, by org, over time). */
router.get("/analytics", adminOnly, async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(String(req.query.days || "30"), 10)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalAccounts,
      connectedAccounts,
      totalChats,
      totalMessages,
      messagesLast24h,
      messagesLast7d,
      messagesByDay,
      messagesByOrg,
      chatsByOrg,
    ] = await Promise.all([
      prisma.whatsapp_account.count(),
      prisma.whatsapp_account.count({ where: { status: "CONNECTED" } }),
      prisma.whatsapp_chat.count(),
      prisma.whatsapp_message.count(),
      prisma.whatsapp_message.count({
        where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.whatsapp_message.count({
        where: { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
        `SELECT date_trunc('day', m.timestamp)::date as day, count(*) as count
         FROM whatsapp_message m
         WHERE m.timestamp >= $1
         GROUP BY date_trunc('day', m.timestamp)
         ORDER BY day ASC`,
        since,
      ),
      prisma.$queryRawUnsafe<
        { organization_id: string; organization_name: string; message_count: bigint }[]
      >(
        `SELECT a.organization_id, o.name as organization_name, count(m.id)::bigint as message_count
         FROM whatsapp_message m
         JOIN whatsapp_chat c ON c.id = m.chat_id
         JOIN whatsapp_account a ON a.id = c.account_id
         JOIN organization o ON o.id = a.organization_id
         WHERE m.timestamp >= $1
         GROUP BY a.organization_id, o.name
         ORDER BY message_count DESC
         LIMIT 50`,
        since,
      ),
      prisma.$queryRawUnsafe<
        { organization_id: string; organization_name: string; chat_count: bigint }[]
      >(
        `SELECT a.organization_id, o.name as organization_name, count(c.id)::bigint as chat_count
         FROM whatsapp_chat c
         JOIN whatsapp_account a ON a.id = c.account_id
         JOIN organization o ON o.id = a.organization_id
         GROUP BY a.organization_id, o.name
         ORDER BY chat_count DESC
         LIMIT 50`,
      ),
    ]);

    const messagesByDaySerialized = (messagesByDay as { day: Date; count: bigint }[]).map(
      (r) => ({
        day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
        count: Number(r.count),
      })
    );

    const messagesByOrgSerialized = (
      messagesByOrg as { organization_id: string; organization_name: string; message_count: bigint }[]
    ).map((r) => ({
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      messageCount: Number(r.message_count),
    }));

    const chatsByOrgSerialized = (
      chatsByOrg as { organization_id: string; organization_name: string; chat_count: bigint }[]
    ).map((r) => ({
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      chatCount: Number(r.chat_count),
    }));

    res.json({
      success: true,
      analytics: {
        totalAccounts,
        connectedAccounts,
        totalChats,
        totalMessages,
        messagesLast24h,
        messagesLast7d,
        messagesByDay: messagesByDaySerialized,
        messagesByOrg: messagesByOrgSerialized,
        chatsByOrg: chatsByOrgSerialized,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to load analytics" });
  }
});

/** GET /api/admin/whatsapp/clients — live clients (running on this server). */
router.get("/clients", adminOnly, async (_req: Request, res: Response) => {
  try {
    const live = await getLiveClientsForAdmin();
    res.json({ success: true, clients: live });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to load clients" });
  }
});

/** POST /api/admin/whatsapp/clients/:organizationId/shutdown — shutdown a live client. */
router.post("/clients/:organizationId/shutdown", adminOnly, async (req: Request, res: Response) => {
  try {
    const organizationId = getPathParam(req, "organizationId");
    if (!organizationId) {
      return res.status(400).json({ success: false, error: "organizationId required" });
    }
    await disconnectClient(organizationId);
    res.json({ success: true, message: "Client shutdown" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to shutdown client" });
  }
});

/** POST /api/admin/whatsapp/clients/:organizationId/always-on — keep client running until admin turns it off. */
router.post("/clients/:organizationId/always-on", adminOnly, async (req: Request, res: Response) => {
  try {
    const organizationId = getPathParam(req, "organizationId");
    if (!organizationId) {
      return res.status(400).json({ success: false, error: "organizationId required" });
    }
    const enabled = !!(req.body as { enabled?: unknown })?.enabled;

    await prisma.organization.update({
      where: { id: organizationId },
      // Prisma client types may lag behind migrations in some builds; keep runtime correct.
      data: { whatsapp_always_on: enabled } as any,
    });

    // Best-effort: if turning on, ensure client is running; if turning off, stop it.
    if (enabled) {
      await startOrRestartClient(organizationId);
    } else {
      await disconnectClient(organizationId);
    }

    res.json({ success: true, organizationId, alwaysOn: enabled });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to update always-on setting" });
  }
});

export { router as adminWhatsappRouter };
