import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization } from "../lib/access.js";
import { getQueryParam, getPathParam } from "../lib/req-params.js";
import { logger } from "../lib/logger.js";
import {
  getAccountStatus,
  startOrRestartClient,
  disconnectClient,
  removeAccount,
  sendMessage,
  fetchChatHistory,
  getContactDisplayNames,
  clearSessionData,
} from "../whatsapp/manager.js";

const router = Router();
router.use(requireAuth);

// ── Middleware: ensure whatsapp_enabled for the org ──────────────────────────

async function requireWhatsappEnabled(req: Request, res: Response): Promise<string | null> {
  const organizationId = getQueryParam(req, "organizationId") || req.body?.organizationId;
  if (!organizationId) {
    res.status(400).json({ error: "organizationId is required" });
    return null;
  }
  if (!(await canAccessOrganization(organizationId, req.user))) {
    res.status(403).json({ error: "Access denied" });
    return null;
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { whatsapp_enabled: true },
  });
  if (!org?.whatsapp_enabled) {
    res.status(403).json({ error: "WhatsApp feature is not enabled for this organization" });
    return null;
  }
  return organizationId;
}

// ── GET /api/whatsapp/enabled?organizationId=... ────────────────────────────

router.get("/enabled", async (req: Request, res: Response) => {
  try {
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whatsapp_enabled: true },
    });
    res.json({ success: true, enabled: org?.whatsapp_enabled || false });
  } catch (error: any) {
    res.json({ success: false, enabled: false, error: error.message });
  }
});

// ── GET /api/whatsapp/accounts?organizationId=... ───────────────────────────

router.get("/accounts", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;

    const account = await getAccountStatus(organizationId);
    res.json({ success: true, account: account || null });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/accounts");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/accounts ─────────────────────────────────────────────

router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;

    const { phoneNumber } = req.body;

    let account = await prisma.whatsapp_account.findUnique({
      where: { organization_id: organizationId },
    });

    if (account) {
      account = await prisma.whatsapp_account.update({
        where: { id: account.id },
        data: {
          phone_number: phoneNumber || account.phone_number,
          status: "CONNECTING",
          last_error: null,
          qr_code: null,
          retry_count: 0,
        },
      });
    } else {
      account = await prisma.whatsapp_account.create({
        data: {
          organization_id: organizationId,
          phone_number: phoneNumber || "",
          status: "CONNECTING",
        },
      });
    }

    // Start/restart the client — this will trigger QR generation
    startOrRestartClient(organizationId).catch((err) => {
      logger.logError(err, "WhatsApp startOrRestartClient failed", { orgId: organizationId });
    });

    res.json({ success: true, account });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/accounts");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/accounts/:id ──────────────────────────────────────────

router.get("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const accountId = getPathParam(req, "id");
    if (!accountId) return res.status(400).json({ error: "Account ID required" });

    const account = await prisma.whatsapp_account.findUnique({
      where: { id: accountId },
      include: { organization: { select: { id: true, whatsapp_enabled: true } } },
    });

    if (!account) return res.status(404).json({ error: "Account not found" });
    if (!(await canAccessOrganization(account.organization_id, req.user))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const status = await getAccountStatus(account.organization_id);
    res.json({ success: true, account: status });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/accounts/:id");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE /api/whatsapp/accounts/:id ───────────────────────────────────────

router.delete("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const accountId = getPathParam(req, "id");
    if (!accountId) return res.status(400).json({ error: "Account ID required" });

    const account = await prisma.whatsapp_account.findUnique({
      where: { id: accountId },
      select: { organization_id: true },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (!(await canAccessOrganization(account.organization_id, req.user))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await removeAccount(account.organization_id);
    res.json({ success: true });
  } catch (error: any) {
    logger.logError(error, "DELETE /api/whatsapp/accounts/:id");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/disconnect?organizationId=... ────────────────────────

router.post("/disconnect", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;

    await disconnectClient(organizationId);
    res.json({ success: true });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/disconnect");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/clear-session?organizationId=... ─────────────────────
router.post("/clear-session", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;
    await clearSessionData(organizationId);
    res.json({ success: true, message: "Session data cleared. Reconnect to show a new QR code." });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/clear-session");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/reconnect?organizationId=... ─────────────────────────

router.post("/reconnect", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;

    startOrRestartClient(organizationId).catch((err) => {
      logger.logError(err, "WhatsApp reconnect failed", { orgId: organizationId });
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/reconnect");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/chats?organizationId=... ──────────────────────────────

router.get("/chats", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;

    const search = getQueryParam(req, "search");
    const unreadOnly = getQueryParam(req, "unreadOnly") === "true";
    const page = parseInt(getQueryParam(req, "page") || "1", 10);
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    const account = await prisma.whatsapp_account.findUnique({
      where: { organization_id: organizationId },
      select: { id: true },
    });

    if (!account) return res.json({ success: true, chats: [], total: 0 });

    const where: Record<string, unknown> = { account_id: account.id };
    // Exclude WhatsApp Status/lid chats (stories) so they never appear in the conversation list.
    where.NOT = {
      OR: [
        { contact_id: { endsWith: "@lid" } },
        { contact_id: { contains: "@lid" } },
        { contact_id: { contains: "status" } },
      ],
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact_id: { contains: search, mode: "insensitive" } },
      ];
    }
    if (unreadOnly) {
      where.unread_count = { gt: 0 };
    }

    const [chats, total] = await Promise.all([
      prisma.whatsapp_chat.findMany({
        where: where as any,
        orderBy: { last_message_at: "desc" },
        skip: offset,
        take: limit,
        include: {
          messages: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              from_me: true,
              type: true,
              timestamp: true,
            },
          },
        },
      }),
      prisma.whatsapp_chat.count({ where: where as any }),
    ]);

    res.json({ success: true, chats, total, page, limit });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/chats");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/chats/:id?organizationId=... ──────────────────────────

router.get("/chats/:id", async (req: Request, res: Response) => {
  try {
    const chatId = getPathParam(req, "id");
    if (!chatId) return res.status(400).json({ error: "Chat ID required" });

    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const cursor = getQueryParam(req, "cursor");
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "100", 10), 100);

    const chat = await prisma.whatsapp_chat.findUnique({
      where: { id: chatId },
      include: { account: { select: { organization_id: true } } },
    });

    if (!chat || chat.account.organization_id !== organizationId) {
      return res.status(404).json({ error: "Chat not found" });
    }
    // Reject Status/lid chats so they are never opened.
    const cid = (chat as any).contact_id ?? "";
    if (cid.toLowerCase().endsWith("@lid") || cid.toLowerCase().includes("@lid") || cid.toLowerCase().includes("status")) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const messageWhere: Record<string, unknown> = { chat_id: chatId };
    if (cursor) {
      messageWhere.created_at = { lt: new Date(cursor) };
    }

    const messages = await prisma.whatsapp_message.findMany({
      where: messageWhere as any,
      orderBy: { timestamp: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Exclude status-update messages (author/lid) so only real chat messages are shown.
    let filtered = messages.filter((m: any) => {
      const from = m.from_number ?? "";
      return !from.toLowerCase().includes("@lid");
    });

    // If DB has no messages, try to backfill from WhatsApp so the user sees history.
    if (filtered.length === 0) {
      const organizationId = getQueryParam(req, "organizationId");
      if (organizationId) {
        const history = await fetchChatHistory(organizationId, chat.contact_id, chatId, 100);
        filtered = history.filter((m: any) => !(m.from_number ?? "").toLowerCase().includes("@lid"));
      }
    }

    const ordered = filtered.reverse();
    const uniqueJids = [...new Set(ordered.map((m: any) => m.from_number).filter(Boolean))];
    const senderNames = await getContactDisplayNames(organizationId, uniqueJids);
    const messagesWithNames = ordered.map((m: any) => ({
      ...m,
      sender_display_name: m.from_number ? senderNames[m.from_number] ?? null : null,
    }));

    res.json({
      success: true,
      chat,
      messages: messagesWithNames,
      hasMore,
      nextCursor: hasMore ? messages[0]?.created_at?.toISOString() : null,
    });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/chats/:id");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/chats/:id/messages ───────────────────────────────────

router.post("/chats/:id/messages", async (req: Request, res: Response) => {
  try {
    const chatId = getPathParam(req, "id");
    if (!chatId) return res.status(400).json({ error: "Chat ID required" });

    const { body: messageBody, clientMessageId, organizationId } = req.body;
    if (!messageBody) return res.status(400).json({ error: "Message body required" });
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });

    if (!(await canAccessOrganization(organizationId, req.user))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whatsapp_enabled: true },
    });
    if (!org?.whatsapp_enabled) {
      return res.status(403).json({ error: "WhatsApp not enabled" });
    }

    const message = await sendMessage({
      organizationId,
      chatId,
      body: messageBody,
      clientMessageId,
    });

    res.json({ success: true, message });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/messages");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/chats/:id/read ───────────────────────────────────────

router.post("/chats/:id/read", async (req: Request, res: Response) => {
  try {
    const chatId = getPathParam(req, "id");
    if (!chatId) return res.status(400).json({ error: "Chat ID required" });

    const organizationId = req.body?.organizationId || getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const chat = await prisma.whatsapp_chat.findUnique({
      where: { id: chatId },
      include: { account: { select: { organization_id: true } } },
    });

    if (!chat || chat.account.organization_id !== organizationId) {
      return res.status(404).json({ error: "Chat not found" });
    }

    await prisma.whatsapp_chat.update({
      where: { id: chatId },
      data: { unread_count: 0 },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/read");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/unread-count?organizationId=... ───────────────────────

router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const account = await prisma.whatsapp_account.findUnique({
      where: { organization_id: organizationId },
      select: { id: true },
    });

    if (!account) return res.json({ success: true, count: 0 });

    const result = await prisma.whatsapp_chat.aggregate({
      where: { account_id: account.id },
      _sum: { unread_count: true },
    });

    res.json({ success: true, count: result._sum.unread_count || 0 });
  } catch (error: any) {
    res.json({ success: false, count: 0, error: error.message });
  }
});

export { router as whatsappRouter };
