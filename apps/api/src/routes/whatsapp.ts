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
  sendMediaMessage,
  fetchChatHistory,
  getContactDisplayNames,
  getContactProfilePictures,
  getContactDetails,
  setContactBlocked,
  clearSessionData,
  forwardMessage,
  starMessage,
  deleteMessage,
  reactToMessage,
  getMessageInfo,
  archiveChat,
  pinChat,
  muteChat,
  markChatUnread,
  sendSeenForChat,
  getChatLabels,
  updateChatLabels,
  setChatNote,
  sendTypingState,
  getGroupMetadata,
  addGroupParticipants,
  removeGroupParticipants,
  promoteGroupParticipants,
  demoteGroupParticipants,
  setGroupSubject,
  setGroupDescription,
  setGroupSettings,
  getGroupInviteCode,
  revokeGroupInvite,
  getGroupMembershipRequests,
  approveGroupMembershipRequests,
  rejectGroupMembershipRequests,
  leaveGroup,
} from "../whatsapp/manager.js";
import {
  getChats as redisGetChats,
  getChatMeta,
  setChatUnread,
  getLastMessage,
  getMessages as redisGetMessages,
  getTotalUnread,
  getChatMessageCount,
} from "../whatsapp/redis-store.js";

const router = Router();
router.use(requireAuth);

function extractMetaTag(html: string, attr: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  const match = re.exec(html);
  return match?.[1]?.trim() || null;
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return match?.[1]?.trim() || null;
}

// ── Middleware: ensure whatsapp_enabled for the org ──────────────────────────

async function requireWhatsappEnabled(req: Request, res: Response): Promise<string | null> {
  const organizationId = getQueryParam(req, "organizationId") || req.body?.organizationId;
  if (!organizationId) { res.status(400).json({ error: "organizationId is required" }); return null; }
  if (!(await canAccessOrganization(organizationId, req.user))) { res.status(403).json({ error: "Access denied" }); return null; }
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { whatsapp_enabled: true } });
  if (!org?.whatsapp_enabled) { res.status(403).json({ error: "WhatsApp feature is not enabled for this organization" }); return null; }
  return organizationId;
}

// ── GET /api/whatsapp/enabled ────────────────────────────────────────────────

router.get("/enabled", async (req: Request, res: Response) => {
  try {
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { whatsapp_enabled: true } });
    res.json({ success: true, enabled: org?.whatsapp_enabled || false });
  } catch (error: any) { res.json({ success: false, enabled: false, error: error.message }); }
});

// ── GET /api/whatsapp/link-preview ───────────────────────────────────────────
router.get("/link-preview", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;
    const raw = getQueryParam(req, "url");
    const target = raw ? decodeURIComponent(raw) : "";
    if (!target || !/^https?:\/\//i.test(target)) return res.status(400).json({ success: false, error: "Valid url is required" });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(target, { redirect: "follow", signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 Luminum WhatsApp LinkPreview" } });
    clearTimeout(timer);
    if (!response.ok) return res.status(200).json({ success: true, preview: null });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return res.status(200).json({ success: true, preview: null });
    const html = await response.text();
    const preview = {
      url: response.url || target,
      title: extractMetaTag(html, "property", "og:title") || extractMetaTag(html, "name", "twitter:title") || extractTitle(html),
      description: extractMetaTag(html, "property", "og:description") || extractMetaTag(html, "name", "description"),
      image: extractMetaTag(html, "property", "og:image") || extractMetaTag(html, "name", "twitter:image"),
      siteName: extractMetaTag(html, "property", "og:site_name"),
    };
    if (!preview.title && !preview.description && !preview.image) return res.status(200).json({ success: true, preview: null });
    return res.json({ success: true, preview });
  } catch { return res.status(200).json({ success: true, preview: null }); }
});

// ── GET /api/whatsapp/accounts ───────────────────────────────────────────────

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

// ── POST /api/whatsapp/accounts ──────────────────────────────────────────────

router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;
    const { phoneNumber } = req.body;
    let account = await prisma.whatsapp_account.findUnique({ where: { organization_id: organizationId } });
    if (account) {
      account = await prisma.whatsapp_account.update({ where: { id: account.id }, data: { phone_number: phoneNumber || account.phone_number, status: "CONNECTING", last_error: null, qr_code: null, retry_count: 0 } });
    } else {
      account = await prisma.whatsapp_account.create({ data: { organization_id: organizationId, phone_number: phoneNumber || "", status: "CONNECTING" } });
    }
    startOrRestartClient(organizationId).catch((err) => logger.logError(err, "WhatsApp startOrRestartClient failed", { orgId: organizationId }));
    res.json({ success: true, account });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/accounts");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/accounts/:id ───────────────────────────────────────────

router.get("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const accountId = getPathParam(req, "id");
    if (!accountId) return res.status(400).json({ error: "Account ID required" });
    const account = await prisma.whatsapp_account.findUnique({ where: { id: accountId }, include: { organization: { select: { id: true, whatsapp_enabled: true } } } });
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (!(await canAccessOrganization(account.organization_id, req.user))) return res.status(403).json({ error: "Access denied" });
    const status = await getAccountStatus(account.organization_id);
    res.json({ success: true, account: status });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/accounts/:id");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE /api/whatsapp/accounts/:id ────────────────────────────────────────

router.delete("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const accountId = getPathParam(req, "id");
    if (!accountId) return res.status(400).json({ error: "Account ID required" });
    const account = await prisma.whatsapp_account.findUnique({ where: { id: accountId }, select: { organization_id: true } });
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (!(await canAccessOrganization(account.organization_id, req.user))) return res.status(403).json({ error: "Access denied" });
    await removeAccount(account.organization_id);
    res.json({ success: true });
  } catch (error: any) {
    logger.logError(error, "DELETE /api/whatsapp/accounts/:id");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/disconnect ────────────────────────────────────────────

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

// ── POST /api/whatsapp/clear-session ─────────────────────────────────────────
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

// ── POST /api/whatsapp/reconnect ─────────────────────────────────────────────

router.post("/reconnect", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;
    startOrRestartClient(organizationId).catch((err) => logger.logError(err, "WhatsApp reconnect failed", { orgId: organizationId }));
    res.json({ success: true });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/reconnect");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/chats — now reads from Redis ───────────────────────────

router.get("/chats", async (req: Request, res: Response) => {
  try {
    const organizationId = await requireWhatsappEnabled(req, res);
    if (!organizationId) return;

    const search = getQueryParam(req, "search");
    const unreadOnly = getQueryParam(req, "unreadOnly") === "true";
    const page = parseInt(getQueryParam(req, "page") || "1", 10);
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    const { chats, total } = await redisGetChats(organizationId, { offset, limit, search: search || undefined, unreadOnly });

    const jids = chats.map((c) => c.contact_id).filter(Boolean);
    const [displayNames, profilePics] = await Promise.all([
      getContactDisplayNames(organizationId, jids),
      getContactProfilePictures(organizationId, jids),
    ]);

    const enrichedChats = await Promise.all(chats.map(async (c) => {
      const lastMsg = await getLastMessage(organizationId, c.contact_id);
      return {
        ...c,
        display_name: displayNames[c.contact_id] ?? null,
        profile_picture_url: profilePics[c.contact_id] ?? null,
        messages: lastMsg ? [{
          id: lastMsg.id,
          body: lastMsg.body,
          from_me: lastMsg.from_me,
          type: lastMsg.type,
          media_url: lastMsg.media_url,
          mime_type: lastMsg.mime_type,
          timestamp: lastMsg.timestamp,
        }] : [],
      };
    }));

    res.json({ success: true, chats: enrichedChats, total, page, limit });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/chats");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/chats/:id — now reads from Redis ───────────────────────

router.get("/chats/:id", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });

    const cid = contactId.toLowerCase();
    if (cid.endsWith("@lid") || cid.includes("status")) return res.status(404).json({ success: false, error: "Chat not found" });

    const cursor = getQueryParam(req, "cursor");
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "100", 10), 100);

    const chat = await getChatMeta(organizationId, contactId);

    let beforeTimestamp: number | undefined;
    if (cursor) beforeTimestamp = new Date(cursor).getTime();

    let { messages, hasMore } = await redisGetMessages(organizationId, contactId, { limit, beforeTimestamp });

    // Filter out lid messages
    messages = messages.filter((m) => !(m.from_number ?? "").toLowerCase().includes("@lid"));

    // If Redis has no messages, backfill from WhatsApp
    if (messages.length === 0 && !cursor) {
      const history = await fetchChatHistory(organizationId, contactId, 100);
      messages = history.filter((m) => !(m.from_number ?? "").toLowerCase().includes("@lid"));
    }

    const uniqueJids = [...new Set(messages.map((m) => m.from_number).filter(Boolean) as string[])];
    const senderNames = await getContactDisplayNames(organizationId, uniqueJids);
    const messagesWithNames = messages.map((m) => ({
      ...m,
      reactions: typeof m.reactions === "string" ? JSON.parse(m.reactions) : m.reactions,
      sender_display_name: m.from_number ? senderNames[m.from_number] ?? null : null,
    }));

    const nextCursor = hasMore && messages.length > 0 ? messages[0].timestamp : null;

    res.json({
      success: true,
      chat: chat ?? { id: contactId, contact_id: contactId, name: null, is_group: false, unread_count: 0 },
      messages: messagesWithNames,
      hasMore,
      nextCursor,
    });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/chats/:id");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/contacts/:chatId ───────────────────────────────────────
router.get("/contacts/:chatId", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "chatId");
    if (!contactId) return res.status(400).json({ success: false, error: "chatId required" });
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const chat = await getChatMeta(organizationId, contactId);
    const details = await getContactDetails(organizationId, contactId);
    const messageCount = await getChatMessageCount(organizationId, contactId);

    return res.json({
      success: true,
      chat: chat ?? { id: contactId, contact_id: contactId, name: null, is_group: false, unread_count: 0 },
      contact: details,
      stats: { messageCount, mediaCount: null, firstMessageAt: null },
    });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/contacts/:chatId");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/contacts/:chatId/block ────────────────────────────────
router.post("/contacts/:chatId/block", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "chatId");
    if (!contactId) return res.status(400).json({ success: false, error: "chatId required" });
    const organizationId = req.body?.organizationId || getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const result = await setContactBlocked(organizationId, contactId, true);
    if (result == null) return res.status(400).json({ success: false, error: "Block not supported for this contact" });
    res.json({ success: true, blocked: true });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/contacts/:chatId/block");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/contacts/:chatId/unblock ──────────────────────────────
router.post("/contacts/:chatId/unblock", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "chatId");
    if (!contactId) return res.status(400).json({ success: false, error: "chatId required" });
    const organizationId = req.body?.organizationId || getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const result = await setContactBlocked(organizationId, contactId, false);
    if (result == null) return res.status(400).json({ success: false, error: "Unblock not supported for this contact" });
    res.json({ success: true, blocked: false });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/contacts/:chatId/unblock");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/chats/:id/messages ────────────────────────────────────

router.post("/chats/:id/messages", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { body: messageBody, clientMessageId, organizationId, quotedMessageId } = req.body;
    if (!messageBody) return res.status(400).json({ error: "Message body required" });
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { whatsapp_enabled: true } });
    if (!org?.whatsapp_enabled) return res.status(403).json({ error: "WhatsApp not enabled" });
    const message = await sendMessage({ organizationId, chatId: contactId, body: messageBody, quotedMessageId, clientMessageId });
    res.json({ success: true, message });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/messages");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/chats/:id/media ───────────────────────────────────────
router.post("/chats/:id/media", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { dataUrl, caption, clientMessageId, organizationId } = req.body;
    if (!dataUrl) return res.status(400).json({ error: "Image data required" });
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const message = await sendMediaMessage({ organizationId, chatId: contactId, dataUrl, caption, clientMessageId });
    res.json({ success: true, message });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/media");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Phase 1: Messaging+ routes ───────────────────────────────────────────────

router.post("/messages/:id/forward", async (req: Request, res: Response) => {
  try {
    const waMessageId = getPathParam(req, "id");
    if (!waMessageId) return res.status(400).json({ error: "Message ID required" });
    const { organizationId, targetChatIds } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!Array.isArray(targetChatIds) || targetChatIds.length === 0) return res.status(400).json({ error: "targetChatIds required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const results = await forwardMessage({ organizationId, waMessageId, targetChatIds });
    res.json({ success: true, results });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/messages/:id/forward");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/messages/:id/star", async (req: Request, res: Response) => {
  try {
    const waMessageId = getPathParam(req, "id");
    if (!waMessageId) return res.status(400).json({ error: "Message ID required" });
    const { organizationId, starred } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await starMessage({ organizationId, waMessageId, starred: starred !== false });
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/messages/:id/star");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/messages/:id/delete", async (req: Request, res: Response) => {
  try {
    const waMessageId = getPathParam(req, "id");
    if (!waMessageId) return res.status(400).json({ error: "Message ID required" });
    const { organizationId, everyone } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await deleteMessage({ organizationId, waMessageId, everyone: everyone === true });
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/messages/:id/delete");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/messages/:id/react", async (req: Request, res: Response) => {
  try {
    const waMessageId = getPathParam(req, "id");
    if (!waMessageId) return res.status(400).json({ error: "Message ID required" });
    const { organizationId, emoji } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (typeof emoji !== "string") return res.status(400).json({ error: "emoji required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await reactToMessage({ organizationId, waMessageId, emoji });
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/messages/:id/react");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/messages/:id/info", async (req: Request, res: Response) => {
  try {
    const waMessageId = getPathParam(req, "id");
    if (!waMessageId) return res.status(400).json({ error: "Message ID required" });
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const info = await getMessageInfo({ organizationId, waMessageId });
    res.json({ success: true, info });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/messages/:id/info");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Phase 2: Chat management routes (now use contact_id as chatId) ───────────

router.post("/chats/:id/archive", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, archive } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await archiveChat(organizationId, contactId, archive !== false);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/archive");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chats/:id/pin", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, pin } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await pinChat(organizationId, contactId, pin !== false);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/pin");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chats/:id/mute", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, mute, unmuteDate } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await muteChat(organizationId, contactId, mute !== false, unmuteDate ? new Date(unmuteDate) : undefined);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/mute");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chats/:id/mark-unread", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await markChatUnread(organizationId, contactId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/mark-unread");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chats/:id/send-seen", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await sendSeenForChat(organizationId, contactId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/send-seen");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/chats/:id/labels", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const labels = await getChatLabels(organizationId, contactId);
    res.json({ success: true, labels });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/chats/:id/labels");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chats/:id/labels", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, labelIds } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await updateChatLabels(organizationId, contactId, labelIds || []);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/labels");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chats/:id/note", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, note } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await setChatNote(organizationId, contactId, note || "");
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/note");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/chats/:id/typing", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, typing } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await sendTypingState(organizationId, contactId, typing !== false);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/typing");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Phase 3: Group routes (chatId = contact_id) ─────────────────────────────

router.get("/groups/:id", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const metadata = await getGroupMetadata(organizationId, contactId);
    res.json({ success: true, group: metadata });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/groups/:id");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/participants/add", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, participantIds } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!Array.isArray(participantIds)) return res.status(400).json({ error: "participantIds required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await addGroupParticipants(organizationId, contactId, participantIds);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/participants/add");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/participants/remove", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, participantIds } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!Array.isArray(participantIds)) return res.status(400).json({ error: "participantIds required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await removeGroupParticipants(organizationId, contactId, participantIds);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/participants/remove");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/participants/promote", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, participantIds } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!Array.isArray(participantIds)) return res.status(400).json({ error: "participantIds required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await promoteGroupParticipants(organizationId, contactId, participantIds);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/participants/promote");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/participants/demote", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, participantIds } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!Array.isArray(participantIds)) return res.status(400).json({ error: "participantIds required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await demoteGroupParticipants(organizationId, contactId, participantIds);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/participants/demote");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/subject", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, subject } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (typeof subject !== "string") return res.status(400).json({ error: "subject required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await setGroupSubject(organizationId, contactId, subject);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/subject");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/description", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, description } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (typeof description !== "string") return res.status(400).json({ error: "description required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await setGroupDescription(organizationId, contactId, description);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/description");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/settings", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, ...settings } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await setGroupSettings(organizationId, contactId, settings);
    res.json({ success: true, settings: result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/settings");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/groups/:id/invite", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await getGroupInviteCode(organizationId, contactId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/groups/:id/invite");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/invite/revoke", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await revokeGroupInvite(organizationId, contactId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/invite/revoke");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/groups/:id/membership-requests", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const requests = await getGroupMembershipRequests(organizationId, contactId);
    res.json({ success: true, requests });
  } catch (error: any) {
    logger.logError(error, "GET /api/whatsapp/groups/:id/membership-requests");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/membership-requests/approve", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, requesterId } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!requesterId) return res.status(400).json({ error: "requesterId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await approveGroupMembershipRequests(organizationId, contactId, requesterId);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/membership-requests/approve");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/membership-requests/reject", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId, requesterId } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!requesterId) return res.status(400).json({ error: "requesterId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await rejectGroupMembershipRequests(organizationId, contactId, requesterId);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/membership-requests/reject");
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/groups/:id/leave", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const result = await leaveGroup(organizationId, contactId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/groups/:id/leave");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/whatsapp/chats/:id/read ────────────────────────────────────────

router.post("/chats/:id/read", async (req: Request, res: Response) => {
  try {
    const contactId = getPathParam(req, "id");
    if (!contactId) return res.status(400).json({ error: "Chat ID required" });
    const organizationId = req.body?.organizationId || getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    await setChatUnread(organizationId, contactId, 0);
    res.json({ success: true });
  } catch (error: any) {
    logger.logError(error, "POST /api/whatsapp/chats/:id/read");
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/whatsapp/unread-count ───────────────────────────────────────────

router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const organizationId = getQueryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Access denied" });
    const count = await getTotalUnread(organizationId).catch(() => 0);
    res.json({ success: true, count });
  } catch (error: any) { res.json({ success: false, count: 0, error: error.message }); }
});

export { router as whatsappRouter };
