import whatsappWeb from "whatsapp-web.js";
import type WAWebJS from "whatsapp-web.js";
import type { PrismaClient } from "@luminum/database";
import { WhatsappAccountStatus } from "@luminum/database/types";
import { PgRemoteAuthStore } from "./remote-auth-store.js";
import { mapWaMessageToDb, mapWaChatToDb } from "./mappers.js";
import { logger } from "../lib/logger.js";
import * as util from "node:util";

// Extract CommonJS exports from whatsapp-web.js
const { Client, RemoteAuth } = whatsappWeb;

// ── Config ────────────────────────────────────────────────────────────────────

const INSTANCE_ID =
  process.env.WHATSAPP_INSTANCE_ID ||
  `api-${process.pid}-${Date.now()}`;

const MAX_ORG_CLIENTS = parseInt(
  process.env.WHATSAPP_MAX_ORG_CLIENTS || "50",
  10,
);

const QR_MAX_RETRIES = parseInt(
  process.env.WHATSAPP_QR_MAX_RETRIES || "5",
  10,
);

const TAKEOVER_ON_CONFLICT =
  process.env.WHATSAPP_TAKEOVER_ON_CONFLICT === "true";

const AUTH_TIMEOUT_MS = parseInt(
  process.env.WHATSAPP_AUTH_TIMEOUT_MS || "60000",
  10,
);

const HEARTBEAT_INTERVAL_MS = 30_000;
const LEASE_TTL_MS = 90_000;

function formatUnknownError(err: unknown): { message: string; details?: string } {
  if (err instanceof Error) {
    return {
      message: err.message || "Unknown error",
      details: err.stack || undefined,
    };
  }
  if (typeof err === "string") return { message: err };
  if (err && typeof err === "object") {
    try {
      return { message: JSON.stringify(err) };
    } catch {
      return { message: util.inspect(err, { depth: 5, maxArrayLength: 50 }) };
    }
  }
  return { message: String(err) };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BroadcastFn {
  (orgId: string, message: { type: string; data?: unknown }, excludeUserId?: string): void;
}

interface BroadcastToAdminsFn {
  (message: { type: string; data?: unknown }): void;
}

export interface LiveClientEntry {
  organizationId: string;
  accountId: string;
  organizationName: string;
  organizationSlug: string | null;
  phoneNumber: string;
  status: string;
  connectedAt: string | null;
  lastSeenAt: string | null;
  runningSinceMs: number | null;
}

interface ManagedClient {
  client: WAWebJS.Client;
  orgId: string;
  accountId: string;
  qrRetries: number;
  ready: boolean;
  destroying: boolean;
}

// ── Singleton state ───────────────────────────────────────────────────────────

let prisma: PrismaClient;
let broadcastToOrg: BroadcastFn;
let broadcastToAdmins: BroadcastToAdminsFn = () => {};
const clients = new Map<string, ManagedClient>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

export async function initWhatsAppManager(deps: {
  prisma: PrismaClient;
  broadcastToOrg: BroadcastFn;
  broadcastToAdmins?: BroadcastToAdminsFn;
}): Promise<void> {
  prisma = deps.prisma;
  broadcastToOrg = deps.broadcastToOrg;
  if (deps.broadcastToAdmins) broadcastToAdmins = deps.broadcastToAdmins;

  // Mark stale CONNECTING accounts as DISCONNECTED
  await prisma.whatsapp_account.updateMany({
    where: { status: "CONNECTING" },
    data: { status: "DISCONNECTED" },
  });

  // Lazy restore: only auto-hydrate a capped set of recently active accounts
  const accountsToRestore = await prisma.whatsapp_account.findMany({
    where: {
      status: "CONNECTED",
      organization: { whatsapp_enabled: true },
    },
    orderBy: { last_seen_at: "desc" },
    take: MAX_ORG_CLIENTS,
    select: { id: true, organization_id: true },
  });

  for (const acc of accountsToRestore) {
    try {
      await startClientForAccount(acc.organization_id);
    } catch (err) {
      logger.logError(err, "Failed to restore WhatsApp client", {
        orgId: acc.organization_id,
        accountId: acc.id,
      });
    }
  }

  // Heartbeat: keep lease alive and update last_seen
  heartbeatTimer = setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS);

  logger.info("WhatsApp Manager initialized", {
    instanceId: INSTANCE_ID,
    restoredClients: accountsToRestore.length,
    maxClients: MAX_ORG_CLIENTS,
  });
}

const CONNECTING_STALE_MS = 5 * 60 * 1000; // 5 min: treat CONNECTING as DISCONNECTED so user can reconnect
const CONNECTED_RECENT_MS = 3 * 60 * 1000; // 3 min: if we saw recent activity, treat as effectively connected

export async function getAccountStatus(organizationId: string) {
  const account = await prisma.whatsapp_account.findUnique({
    where: { organization_id: organizationId },
  });
  if (!account) return null;

  const managed = clients.get(organizationId);
  const isClientReady = managed?.ready ?? false;

  // Clear stale QR codes (older than 5 min)
  let qrCode = account.qr_code;
  if (qrCode && account.qr_updated_at) {
    const ageMs = Date.now() - account.qr_updated_at.getTime();
    if (ageMs > 5 * 60 * 1000) qrCode = null;
  }

  // Derive an effective status for UI.
  // - CONNECTING can be stale (client crashed / link removed) -> DISCONNECTED
  // - CONNECTING can also happen even though we've already connected (race between status writes / multi-instance) -> CONNECTED
  let status = account.status;
  const nowMs = Date.now();
  const updatedAtMs = account.updated_at ? account.updated_at.getTime() : 0;
  const leaseExpiresMs = account.lease_expires_at ? account.lease_expires_at.getTime() : 0;
  const lastSeenMs = account.last_seen_at ? account.last_seen_at.getTime() : 0;
  const connectedAtMs = account.connected_at ? account.connected_at.getTime() : 0;

  if (status === "CONNECTING") {
    // If our lease has expired and we never became ready, treat as disconnected.
    if (leaseExpiresMs && leaseExpiresMs < nowMs) {
      status = "DISCONNECTED";
    } else if ((lastSeenMs && nowMs - lastSeenMs < CONNECTED_RECENT_MS) || (connectedAtMs && nowMs - connectedAtMs < CONNECTED_RECENT_MS)) {
      // We were recently active/connected, so show as connected even if status hasn't flipped yet.
      status = "CONNECTED";
    } else if (updatedAtMs && nowMs - updatedAtMs > CONNECTING_STALE_MS) {
      status = "DISCONNECTED";
    }
  }

  return {
    ...account,
    status,
    qr_code: qrCode,
    clientReady: isClientReady,
  };
}

export async function startOrRestartClient(organizationId: string) {
  const existing = clients.get(organizationId);
  if (existing) {
    await destroyClient(organizationId);
  }
  return startClientForAccount(organizationId);
}

export async function disconnectClient(organizationId: string) {
  const managed = clients.get(organizationId);
  if (managed) {
    await destroyClient(organizationId);
  }
  await prisma.whatsapp_account.updateMany({
    where: { organization_id: organizationId },
    data: {
      status: "DISCONNECTED",
      qr_code: null,
      owner_instance_id: null,
      lease_expires_at: null,
    },
  });
}

export async function removeAccount(organizationId: string) {
  await disconnectClient(organizationId);
  await prisma.whatsapp_account.deleteMany({
    where: { organization_id: organizationId },
  });
}

export async function sendMessage(opts: {
  organizationId: string;
  chatId: string;
  body: string;
  clientMessageId?: string;
}) {
  const { organizationId, chatId, body, clientMessageId } = opts;

  // Idempotency: check if message already exists
  if (clientMessageId) {
    const existing = await prisma.whatsapp_message.findFirst({
      where: { chat_id: chatId, client_message_id: clientMessageId },
    });
    if (existing) return existing;
  }

  const managed = await ensureClient(organizationId);
  if (!managed || !managed.ready) {
    throw new Error("WhatsApp client not ready");
  }

  const chat = await prisma.whatsapp_chat.findUnique({
    where: { id: chatId },
    select: { contact_id: true, account_id: true },
  });
  if (!chat) throw new Error("Chat not found");

  const sentMsg: WAWebJS.Message = await managed.client.sendMessage(
    chat.contact_id,
    body,
  );

  const mapped = mapWaMessageToDb(sentMsg, chatId);
  const message = await prisma.whatsapp_message.upsert({
    where: {
      chat_id_wa_message_id: { chat_id: chatId, wa_message_id: mapped.wa_message_id },
    },
    create: {
      ...mapped,
      client_message_id: clientMessageId || null,
      sent_at: new Date(),
    },
    update: {
      ack: sentMsg.ack ?? 0,
      sent_at: new Date(),
    },
  });

  await prisma.whatsapp_chat.update({
    where: { id: chatId },
    data: { last_message_at: new Date() },
  });

  broadcastToOrg(organizationId, {
    type: "whatsapp:message",
    data: { chatId, message },
  });

  return message;
}

// ── Internal: client lifecycle ────────────────────────────────────────────────

async function ensureClient(organizationId: string): Promise<ManagedClient | null> {
  const existing = clients.get(organizationId);
  if (existing && existing.ready) return existing;

  if (clients.size >= MAX_ORG_CLIENTS) {
    logger.warn("WhatsApp client limit reached", {
      limit: MAX_ORG_CLIENTS,
      orgId: organizationId,
    });
    return null;
  }

  return startClientForAccount(organizationId);
}

async function startClientForAccount(organizationId: string): Promise<ManagedClient | null> {
  const account = await prisma.whatsapp_account.findUnique({
    where: { organization_id: organizationId },
    include: { organization: { select: { whatsapp_enabled: true } } },
  });

  if (!account || !account.organization.whatsapp_enabled) {
    return null;
  }

  if (clients.size >= MAX_ORG_CLIENTS) {
    logger.warn("WhatsApp client limit reached on start", {
      limit: MAX_ORG_CLIENTS,
      orgId: organizationId,
    });
    return null;
  }

  // Acquire lease
  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + LEASE_TTL_MS);

  const updated = await prisma.whatsapp_account.updateMany({
    where: {
      id: account.id,
      OR: [
        { owner_instance_id: null },
        { owner_instance_id: INSTANCE_ID },
        { lease_expires_at: { lt: now } },
      ],
    },
    data: {
      owner_instance_id: INSTANCE_ID,
      owner_heartbeat_at: now,
      lease_expires_at: leaseExpiry,
      status: "CONNECTING",
    },
  });

  if (updated.count === 0) {
    logger.warn("Could not acquire lease for WhatsApp account", {
      accountId: account.id,
      orgId: organizationId,
    });
    return null;
  }

  const store = new PgRemoteAuthStore(prisma);

  // In Docker/server, Puppeteer's bundled Chrome often isn't present (ENOENT). Use system Chromium when set.
  const puppeteerExecutablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROMIUM_PATH ||
    "";

  const puppeteerOptions: Record<string, unknown> = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  };
  if (puppeteerExecutablePath) {
    puppeteerOptions.executablePath = puppeteerExecutablePath;
  }

  const client = new Client({
    authStrategy: new RemoteAuth({
      store,
      clientId: account.id,
      backupSyncIntervalMs: 60_000,
    }),
    authTimeoutMs: AUTH_TIMEOUT_MS,
    takeoverOnConflict: TAKEOVER_ON_CONFLICT,
    puppeteer: puppeteerOptions,
  });

  const managed: ManagedClient = {
    client,
    orgId: organizationId,
    accountId: account.id,
    qrRetries: 0,
    ready: false,
    destroying: false,
  };

  clients.set(organizationId, managed);
  attachEventHandlers(managed);

  try {
    await client.initialize();
  } catch (err) {
    const formatted = formatUnknownError(err);
    logger.logError(err, "WhatsApp client initialization failed", {
      orgId: organizationId,
      accountId: account.id,
      error_message: formatted.message,
      error_details: formatted.details,
    });
    clients.delete(organizationId);
    await prisma.whatsapp_account.update({
      where: { id: account.id },
      data: {
        status: "ERROR",
        last_error: formatted.details ? `${formatted.message}\n${formatted.details}` : formatted.message,
        owner_instance_id: null,
        lease_expires_at: null,
      },
    });
    return null;
  }

  return managed;
}

function attachEventHandlers(managed: ManagedClient) {
  const { client, orgId, accountId } = managed;

  client.on("qr", async (qr: string) => {
    managed.qrRetries++;
    if (managed.qrRetries > QR_MAX_RETRIES) {
      logger.warn("WhatsApp QR max retries exceeded", { orgId, accountId });
      await prisma.whatsapp_account.update({
        where: { id: accountId },
        data: {
          status: "ERROR",
          last_error: "QR code scan timeout — max retries exceeded",
          qr_code: null,
        },
      });
      broadcastToOrg(orgId, {
        type: "whatsapp:status",
        data: { status: "auth_failure", error: "QR max retries exceeded" },
      });
      await destroyClient(orgId);
      return;
    }

    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: {
        status: "QR_PENDING",
        qr_code: qr,
        qr_updated_at: new Date(),
      },
    });

    broadcastToOrg(orgId, {
      type: "whatsapp:status",
      data: { status: "qr_pending", qr },
    });
  });

  client.on("authenticated", () => {
    logger.info("WhatsApp client authenticated", { orgId, accountId });
  });

  client.on("ready", async () => {
    managed.ready = true;
    managed.qrRetries = 0;

    const info = client.info;
    const phoneNumber = info?.wid?.user || "";

    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: {
        status: "CONNECTED",
        connected_at: new Date(),
        last_seen_at: new Date(),
        last_error: null,
        qr_code: null,
        retry_count: 0,
        next_retry_at: null,
        phone_number: phoneNumber || undefined,
      },
    });

    broadcastToOrg(orgId, {
      type: "whatsapp:status",
      data: { status: "connected", phoneNumber },
    });

    broadcastToAdmins({
      type: "whatsapp:client_connected",
      data: { organizationId: orgId, accountId, phoneNumber, connectedAt: new Date().toISOString() },
    });

    logger.info("WhatsApp client ready", { orgId, accountId, phoneNumber });

    // Sync all real chats into DB so the list shows all conversations (not only those that had a message since connect).
    syncAllChats(managed).catch((err) =>
      logger.logError(err, "WhatsApp sync all chats failed", { orgId, accountId })
    );
  });

  client.on("remote_session_saved", async () => {
    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: { session_saved_at: new Date() },
    });
    logger.debug("WhatsApp remote session saved", { orgId, accountId });
  });

  client.on("message", async (msg: WAWebJS.Message) => {
    if (managed.destroying) return;
    try {
      await handleInboundMessage(managed, msg);
    } catch (err) {
      logger.logError(err, "Error handling inbound WhatsApp message", {
        orgId,
        accountId,
      });
    }
  });

  client.on("message_create", async (msg: WAWebJS.Message) => {
    if (managed.destroying) return;
    if (!msg.fromMe) return;
    try {
      await handleOutboundReconciliation(managed, msg);
    } catch (err) {
      logger.logError(err, "Error reconciling outbound WhatsApp message", {
        orgId,
        accountId,
      });
    }
  });

  client.on("message_ack", async (msg: WAWebJS.Message, ack: number) => {
    if (managed.destroying) return;
    try {
      await handleAckUpdate(managed, msg, ack);
    } catch (err) {
      logger.logError(err, "Error handling WhatsApp message ack", {
        orgId,
        accountId,
      });
    }
  });

  client.on("disconnected", async (reason: string) => {
    logger.warn("WhatsApp client disconnected", { orgId, accountId, reason });

    managed.ready = false;

    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: {
        status: "DISCONNECTED",
        last_error: reason,
        owner_instance_id: null,
        lease_expires_at: null,
      },
    });

    broadcastToOrg(orgId, {
      type: "whatsapp:status",
      data: { status: "disconnected", reason },
    });

    broadcastToAdmins({ type: "whatsapp:client_disconnected", data: { organizationId: orgId } });
    clients.delete(orgId);
  });

  client.on("auth_failure", async (msg: string) => {
    logger.error("WhatsApp auth failure", { orgId, accountId, error: msg });

    managed.ready = false;

    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: {
        status: "ERROR",
        last_error: `Auth failure: ${msg}`,
        session_data: null,
        owner_instance_id: null,
        lease_expires_at: null,
      },
    });

    broadcastToOrg(orgId, {
      type: "whatsapp:status",
      data: { status: "auth_failure", error: msg },
    });

    broadcastToAdmins({ type: "whatsapp:client_disconnected", data: { organizationId: orgId } });
    clients.delete(orgId);
  });

  client.on("change_state", async (state: WAWebJS.WAState) => {
    broadcastToOrg(orgId, {
      type: "whatsapp:status",
      data: { status: "state_change", state },
    });
  });
}

// ── Chat sync ─────────────────────────────────────────────────────────────────

async function syncAllChats(managed: ManagedClient): Promise<void> {
  const { client, accountId } = managed;
  let chats: WAWebJS.Chat[];
  try {
    chats = await client.getChats();
  } catch (err) {
    throw err;
  }
  for (const waChat of chats) {
    const idSer = waChat.id?._serialized;
    if (!idSer || isStatusOrLidChat(idSer) || (waChat as any).name === "Status") continue;
    const payload = mapWaChatToDb(waChat, accountId);
    const lastMsgTs = (waChat as any).timestamp;
    const last_message_at = lastMsgTs ? new Date(lastMsgTs * 1000) : new Date();
    await prisma.whatsapp_chat.upsert({
      where: {
        account_id_contact_id: { account_id: accountId, contact_id: payload.contact_id },
      },
      create: {
        ...payload,
        last_message_at,
      },
      update: {
        name: payload.name ?? undefined,
        last_message_at,
      },
    });
  }
  // Remove any Status/lid chats that may have been created before filters existed.
  await prisma.whatsapp_chat.deleteMany({
    where: {
      account_id: accountId,
      OR: [
        { contact_id: { endsWith: "@lid" } },
        { contact_id: { contains: "@lid" } },
      ],
    },
  }).catch(() => {});

  logger.info("WhatsApp synced all chats", { orgId: managed.orgId, accountId, count: chats.length });
}

// ── Message handling ──────────────────────────────────────────────────────────

/** Skip status (WhatsApp Status/stories) and lid-only chats so they are not stored as conversations. */
function isStatusOrLidChat(contactId: string): boolean {
  const lower = contactId.toLowerCase();
  return lower.endsWith("@lid") || lower.includes("status");
}

async function handleInboundMessage(managed: ManagedClient, msg: WAWebJS.Message) {
  const { orgId, accountId } = managed;

  const chatContactId = msg.from;
  if (isStatusOrLidChat(chatContactId)) return;

  const waChat = await msg.getChat();
  const chatIdSerialized = waChat.id?._serialized ?? chatContactId;
  if (isStatusOrLidChat(chatIdSerialized) || (waChat as any).name === "Status") return;

  const chat = await prisma.whatsapp_chat.upsert({
    where: {
      account_id_contact_id: {
        account_id: accountId,
        contact_id: chatContactId,
      },
    },
    create: {
      ...mapWaChatToDb(waChat, accountId),
      last_message_at: new Date(),
      unread_count: 1,
    },
    update: {
      name: waChat.name || undefined,
      last_message_at: new Date(),
      unread_count: { increment: 1 },
    },
  });

  const mapped = mapWaMessageToDb(msg, chat.id);
  let createData: any = mapped;
  // Best-effort media capture (enables images on dashboard). Keep it bounded to avoid huge DB rows.
  if ((msg as any).hasMedia) {
    try {
      const media = await (msg as any).downloadMedia?.();
      if (media?.data && typeof media.data === "string" && typeof media.mimetype === "string") {
        const approxBytes = Math.floor((media.data.length * 3) / 4);
        if (approxBytes <= 1_500_000) {
          createData = {
            ...mapped,
            media_url: `data:${media.mimetype};base64,${media.data}`,
            mime_type: media.mimetype,
            media_size: approxBytes,
          };
        }
      }
    } catch {
      // ignore media download failures
    }
  }

  const message = await prisma.whatsapp_message.upsert({
    where: {
      chat_id_wa_message_id: {
        chat_id: chat.id,
        wa_message_id: mapped.wa_message_id,
      },
    },
    create: createData,
    update: {},
  });

  broadcastToOrg(orgId, {
    type: "whatsapp:message",
    data: { chatId: chat.id, message, chat },
  });
}

async function handleOutboundReconciliation(managed: ManagedClient, msg: WAWebJS.Message) {
  const { accountId, orgId } = managed;

  const chatContactId = msg.to;
  if (isStatusOrLidChat(chatContactId)) return;

  const waChat = await msg.getChat();
  const chatIdSerialized = waChat.id?._serialized ?? chatContactId;
  if (isStatusOrLidChat(chatIdSerialized) || (waChat as any).name === "Status") return;

  const chat = await prisma.whatsapp_chat.upsert({
    where: {
      account_id_contact_id: {
        account_id: accountId,
        contact_id: chatContactId,
      },
    },
    create: {
      ...mapWaChatToDb(waChat, accountId),
      last_message_at: new Date(),
    },
    update: {
      name: waChat.name || undefined,
      last_message_at: new Date(),
    },
  });

  const mapped = mapWaMessageToDb(msg, chat.id);
  let createData: any = { ...mapped, sent_at: new Date() };
  if ((msg as any).hasMedia) {
    try {
      const media = await (msg as any).downloadMedia?.();
      if (media?.data && typeof media.data === "string" && typeof media.mimetype === "string") {
        const approxBytes = Math.floor((media.data.length * 3) / 4);
        if (approxBytes <= 1_500_000) {
          createData = {
            ...createData,
            media_url: `data:${media.mimetype};base64,${media.data}`,
            mime_type: media.mimetype,
            media_size: approxBytes,
          };
        }
      }
    } catch {
      // ignore media download failures
    }
  }

  await prisma.whatsapp_message.upsert({
    where: {
      chat_id_wa_message_id: {
        chat_id: chat.id,
        wa_message_id: mapped.wa_message_id,
      },
    },
    create: createData,
    update: {},
  });
}

async function handleAckUpdate(managed: ManagedClient, msg: WAWebJS.Message, ack: number) {
  const waMessageId = msg.id._serialized;
  const now = new Date();

  const updateData: Record<string, unknown> = {
    ack,
    ack_updated_at: now,
  };

  if (ack >= 1 && !msg.fromMe) updateData.sent_at = now;
  if (ack >= 2) updateData.delivered_at = now;
  if (ack >= 3) updateData.read_at = now;

  // Find all messages with this wa_message_id (should be unique per chat)
  const messages = await prisma.whatsapp_message.findMany({
    where: { wa_message_id: waMessageId },
    select: { id: true, chat_id: true },
  });

  for (const m of messages) {
    await prisma.whatsapp_message.update({
      where: { id: m.id },
      data: updateData,
    });

    const account = await prisma.whatsapp_chat.findUnique({
      where: { id: m.chat_id },
      select: { account: { select: { organization_id: true } } },
    });

    if (account?.account?.organization_id) {
      broadcastToOrg(account.account.organization_id, {
        type: "whatsapp:message",
        data: {
          chatId: m.chat_id,
          messageId: m.id,
          ack,
          ack_updated_at: now.toISOString(),
        },
      });
    }
  }
}

/** Resolve display names for JIDs (e.g. for group message senders). Returns map of jid -> display name. */
export async function getContactDisplayNames(
  organizationId: string,
  jids: string[],
): Promise<Record<string, string>> {
  const managed = await ensureClient(organizationId);
  if (!managed?.ready || jids.length === 0) return {};
  const out: Record<string, string> = {};
  const unique = [...new Set(jids)].filter((j) => j && !j.toLowerCase().includes("@lid"));
  for (const jid of unique) {
    try {
      const contact = await managed.client.getContactById(jid);
      const name = (contact as any).name ?? (contact as any).pushname ?? (contact as any).shortName;
      if (typeof name === "string" && name.trim()) out[jid] = name.trim();
    } catch {
      // ignore per-contact failures
    }
  }
  return out;
}

/** Fetch recent message history from WhatsApp for a chat and upsert into DB. Returns saved messages (oldest first). */
export async function fetchChatHistory(
  organizationId: string,
  contactId: string,
  dbChatId: string,
  limit = 50,
): Promise<Awaited<ReturnType<typeof prisma.whatsapp_message.findMany>>[number][]> {
  const managed = await ensureClient(organizationId);
  if (!managed?.ready) return [];

  try {
    const waChat = await managed.client.getChatById(contactId);
    const waMessages = await waChat.fetchMessages({ limit });
    const saved: Awaited<ReturnType<typeof prisma.whatsapp_message.findMany>>[number][] = [];
    for (const msg of waMessages) {
      const from = (msg as any).from ?? (msg as any).author ?? "";
      if (typeof from === "string" && from.toLowerCase().includes("@lid")) continue;
      const mapped = mapWaMessageToDb(msg, dbChatId);
      const created = await prisma.whatsapp_message.upsert({
        where: {
          chat_id_wa_message_id: { chat_id: dbChatId, wa_message_id: mapped.wa_message_id },
        },
        create: mapped,
        update: {},
      });
      saved.push(created);
    }
    if (saved.length > 0) {
      await prisma.whatsapp_chat.update({
        where: { id: dbChatId },
        data: { last_message_at: saved[saved.length - 1].timestamp },
      });
    }
    return saved;
  } catch (err) {
    logger.logError(err, "WhatsApp fetch chat history failed", { organizationId, contactId });
    return [];
  }
}

/** Returns live WhatsApp clients for admin dashboard (organization, phone, uptime, etc.). */
export async function getLiveClientsForAdmin(): Promise<LiveClientEntry[]> {
  const accountIds = Array.from(clients.values()).map((m) => m.accountId);
  if (accountIds.length === 0) return [];

  const accounts = await prisma.whatsapp_account.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true,
      organization_id: true,
      phone_number: true,
      status: true,
      connected_at: true,
      last_seen_at: true,
      organization: { select: { name: true, slug: true } },
    },
  });

  const now = Date.now();
  return accounts.map((a) => ({
    organizationId: a.organization_id,
    accountId: a.id,
    organizationName: a.organization.name,
    organizationSlug: a.organization.slug,
    phoneNumber: a.phone_number || "",
    status: a.status,
    connectedAt: a.connected_at?.toISOString() ?? null,
    lastSeenAt: a.last_seen_at?.toISOString() ?? null,
    runningSinceMs:
      a.connected_at != null ? Math.max(0, now - a.connected_at.getTime()) : null,
  }));
}

// ── Client destruction ────────────────────────────────────────────────────────
// We only call client.destroy() (which runs authStrategy.destroy(), not disconnect()).
// So the RemoteAuth session stays in the DB and the next ensureClient() restores from it
// without requiring QR again.

async function destroyClient(organizationId: string) {
  const managed = clients.get(organizationId);
  if (!managed) return;

  managed.destroying = true;
  managed.ready = false;
  clients.delete(organizationId);
  broadcastToAdmins({ type: "whatsapp:client_disconnected", data: { organizationId } });

  try {
    await managed.client.destroy();
  } catch (err) {
    logger.logError(err, "Error destroying WhatsApp client", {
      orgId: organizationId,
    });
  }
}

// ── Heartbeat (lease renewal) ─────────────────────────────────────────────────

async function runHeartbeat() {
  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + LEASE_TTL_MS);

  for (const [orgId, managed] of clients) {
    try {
      await prisma.whatsapp_account.update({
        where: { id: managed.accountId },
        data: {
          owner_heartbeat_at: now,
          lease_expires_at: leaseExpiry,
          last_seen_at: managed.ready ? now : undefined,
        },
      });
    } catch (err) {
      logger.logError(err, "WhatsApp heartbeat failed", { orgId });
    }
  }
}

export function shutdownWhatsAppManager() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  const destroyPromises: Promise<void>[] = [];
  for (const [orgId] of clients) {
    destroyPromises.push(destroyClient(orgId));
  }

  return Promise.allSettled(destroyPromises);
}
