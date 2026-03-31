import "./fs-extra-unlink-patch.js";
import whatsappWeb from "whatsapp-web.js";
import type WAWebJS from "whatsapp-web.js";
import type { PrismaClient } from "@luminum/database";
import { PgRemoteAuthStore } from "./remote-auth-store.js";
import { mapWaMessageToRedis, mapWaChatToRedis } from "./mappers.js";
import { logger } from "../lib/logger.js";
import * as util from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import {
  upsertChat,
  getChatMeta,
  updateChatFields,
  setChatUnread,
  upsertMessage,
  getMessage,
  updateMessageFields,
  findMessageByClientId,
  deleteAllOrgData,
  isRedisAvailable,
  type RedisMessage,
  type RedisChatMeta,
} from "./redis-store.js";
import {
  recordWhatsAppClientEvent,
  WhatsAppNotReadyError,
} from "./whatsapp-client-events.js";
import {
  markInvoiceWhatsappPdfSeen,
  parseInvoiceIdFromWaClientMessageId,
} from "../lib/invoice-whatsapp-read-receipt.js";

const { Client, RemoteAuth, MessageMedia } = whatsappWeb;

// ── Config ────────────────────────────────────────────────────────────────────

const INSTANCE_ID =
  process.env.WHATSAPP_INSTANCE_ID || `api-${process.pid}-${Date.now()}`;

const MAX_ORG_CLIENTS = parseInt(process.env.WHATSAPP_MAX_ORG_CLIENTS || "50", 10);
const QR_MAX_RETRIES = parseInt(process.env.WHATSAPP_QR_MAX_RETRIES || "5", 10);
const TAKEOVER_ON_CONFLICT = process.env.WHATSAPP_TAKEOVER_ON_CONFLICT === "true";
const AUTH_TIMEOUT_MS = parseInt(process.env.WHATSAPP_AUTH_TIMEOUT_MS || "120000", 10);
const PUPPETEER_PROTOCOL_TIMEOUT_MS = parseInt(process.env.WHATSAPP_PROTOCOL_TIMEOUT_MS || "600000", 10);
const HEARTBEAT_INTERVAL_MS = 30_000;
const LEASE_TTL_MS = 90_000;
const ALWAYS_ON_RECOVERY_COOLDOWN_MS = Math.max(
  30_000,
  parseInt(process.env.WHATSAPP_ALWAYS_ON_COOLDOWN_MS || "90000", 10)
);
const INIT_RETRY_MAX = Math.max(1, parseInt(process.env.WHATSAPP_INIT_RETRY_MAX || "6", 10));
const INIT_RETRY_BASE_MS = Math.max(2000, parseInt(process.env.WHATSAPP_INIT_RETRY_BASE_MS || "6000", 10));
const WAIT_READY_MS = Math.max(15_000, parseInt(process.env.WHATSAPP_WAIT_READY_MS || "120000", 10));
const WAIT_READY_ALWAYS_ON_MS = Math.max(WAIT_READY_MS, parseInt(process.env.WHATSAPP_ALWAYS_ON_WAIT_READY_MS || "240000", 10));
const READY_POLL_MS = Math.max(200, parseInt(process.env.WHATSAPP_READY_POLL_MS || "400", 10));
const ALWAYS_ON_RECONNECT_DELAY_MS = Math.max(2000, parseInt(process.env.WHATSAPP_ALWAYS_ON_RECONNECT_MS || "5000", 10));
const ALWAYS_ON_MAX_BACKOFF_MS = Math.max(
  ALWAYS_ON_RECONNECT_DELAY_MS,
  parseInt(process.env.WHATSAPP_ALWAYS_ON_MAX_BACKOFF_MS || "1800000", 10)
);
/** Do not spam admin incident log with identical INIT_EXHAUSTED rows every reconnect cycle. */
const INIT_EXHAUSTED_LOG_COOLDOWN_MS = Math.max(
  60_000,
  parseInt(process.env.WHATSAPP_INIT_EXHAUSTED_LOG_COOLDOWN_MS || "600000", 10)
);
const MAX_INLINE_MEDIA_BYTES = Math.max(256_000, parseInt(process.env.WHATSAPP_MAX_INLINE_MEDIA_BYTES || "1500000", 10));

function formatUnknownError(err: unknown): { message: string; details?: string } {
  if (err instanceof Error) {
    const details = [err.stack, err.cause != null ? String(err.cause) : null].filter(Boolean).join("\nCaused by: ");
    return { message: err.message || "Unknown error", details: details || undefined };
  }
  if (typeof err === "string") return { message: err };
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const msg = typeof obj.message === "string" ? obj.message : undefined;
    const stack = typeof obj.stack === "string" ? obj.stack : undefined;
    if (msg || stack) return { message: msg || "Unknown error", details: stack || undefined };
    try {
      const json = JSON.stringify(err);
      if (json === "{}" || json === "[]" || json.length < 10) {
        return { message: util.inspect(err, { depth: 4, maxArrayLength: 20, showHidden: true }) };
      }
      return { message: json };
    } catch { return { message: util.inspect(err, { depth: 4, maxArrayLength: 20, showHidden: true }) }; }
  }
  return { message: String(err) };
}

function isBrowserAlreadyRunningError(err: unknown): boolean {
  const msg = formatUnknownError(err).message.toLowerCase();
  return msg.includes("browser is already running for") || msg.includes("used by another process");
}

async function cleanupChromiumLockFiles(userDataDir: string): Promise<void> {
  for (const name of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    try {
      await fs.rm(path.join(userDataDir, name), { force: true });
    } catch {
      /* ignore */
    }
  }
}

function isExecutionContextDestroyedError(err: unknown): boolean {
  const msg = formatUnknownError(err).message;
  return (
    /execution context was destroyed|target closed|session closed|browser has disconnected/i.test(msg) ||
    /runtime\.callfunctionon timed out|protocol error \(runtime\.callfunctionon\)/i.test(msg)
  );
}

function isIndexedDbCorruptionError(err: unknown): boolean {
  const msg = formatUnknownError(err).message.toLowerCase();
  return (
    msg.includes("indexeddb") ||
    msg.includes("leveldb") ||
    (msg.includes("enoent") && msg.includes("remoteauth"))
  );
}

/** Removes local Chromium profile under RemoteAuth (PostgreSQL session still restores via RemoteAuth). */
async function cleanupRemoteAuthLocalBrowserProfile(userDataDir: string): Promise<void> {
  await cleanupChromiumLockFiles(userDataDir);
  for (const sub of ["Default", "Crashpad", "GPUCache", "Code Cache"]) {
    try {
      await fs.rm(path.join(userDataDir, sub), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

async function safeUpdateAccountById(accountId: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const updated = await prisma.whatsapp_account.updateMany({ where: { id: accountId }, data: data as any });
    return updated.count > 0;
  } catch { return false; }
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
  alwaysOn: boolean;
}

export interface ManagedClient {
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
/** One in-flight start per org — avoids stacked Puppeteer launches from drift + always-on + manual reconnect. */
const startClientInflight = new Map<string, Promise<ManagedClient | null>>();
/** Exponential backoff generation for always-on reconnects (reset on successful `ready`). */
const alwaysOnReconnectGeneration = new Map<string, number>();
const lastInitExhaustedIncidentAt = new Map<string, number>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const lastAlwaysOnRecoveryAttempt = new Map<string, number>();
const lastDriftEventLogged = new Map<string, number>();
const DRIFT_LOG_COOLDOWN_MS = 5 * 60 * 1000;
let alwaysOnRecoveryRunning = false;

function bumpAlwaysOnBackoff(organizationId: string): number {
  const gen = (alwaysOnReconnectGeneration.get(organizationId) ?? 0) + 1;
  alwaysOnReconnectGeneration.set(organizationId, gen);
  return Math.min(
    ALWAYS_ON_RECONNECT_DELAY_MS * Math.pow(2, Math.min(gen - 1, 10)),
    ALWAYS_ON_MAX_BACKOFF_MS
  );
}

function resetAlwaysOnBackoff(organizationId: string): void {
  alwaysOnReconnectGeneration.delete(organizationId);
  lastInitExhaustedIncidentAt.delete(organizationId);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initWhatsAppManager(deps: {
  prisma: PrismaClient;
  broadcastToOrg: BroadcastFn;
  broadcastToAdmins?: BroadcastToAdminsFn;
}): Promise<void> {
  prisma = deps.prisma;
  broadcastToOrg = deps.broadcastToOrg;
  if (deps.broadcastToAdmins) broadcastToAdmins = deps.broadcastToAdmins;

  const redisOk = await isRedisAvailable();
  if (!redisOk) {
    logger.error("Redis is NOT available — WhatsApp runtime will not function. Set REDIS_URL.");
  }

  await prisma.whatsapp_account.updateMany({ where: { status: "CONNECTING" }, data: { status: "DISCONNECTED" } });

  const accountsToRestore = await prisma.whatsapp_account.findMany({
    where: { status: "CONNECTED", organization: { whatsapp_enabled: true } },
    orderBy: [{ organization: { whatsapp_always_on: "desc" } } as any, { last_seen_at: "desc" }],
    take: MAX_ORG_CLIENTS,
    select: { id: true, organization_id: true },
  });

  for (const acc of accountsToRestore) {
    try { await startClientForAccount(acc.organization_id); }
    catch (err) { logger.logError(err, "Failed to restore WhatsApp client", { orgId: acc.organization_id, accountId: acc.id }); }
  }

  heartbeatTimer = setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS);
  logger.info("WhatsApp Manager initialized", { instanceId: INSTANCE_ID, restoredClients: accountsToRestore.length, maxClients: MAX_ORG_CLIENTS });
}

const CONNECTING_STALE_MS = 5 * 60 * 1000;
const CONNECTED_RECENT_MS = 3 * 60 * 1000;

export async function getAccountStatus(organizationId: string) {
  const account = await prisma.whatsapp_account.findUnique({ where: { organization_id: organizationId } });
  if (!account) return null;

  const managed = clients.get(organizationId);
  const isClientReady = managed?.ready ?? false;
  let qrCode = account.qr_code;
  if (qrCode && account.qr_updated_at) {
    if (Date.now() - account.qr_updated_at.getTime() > 5 * 60 * 1000) qrCode = null;
  }

  let status = account.status;
  const nowMs = Date.now();
  const updatedAtMs = account.updated_at ? account.updated_at.getTime() : 0;
  const leaseExpiresMs = account.lease_expires_at ? account.lease_expires_at.getTime() : 0;
  const lastSeenMs = account.last_seen_at ? account.last_seen_at.getTime() : 0;
  const connectedAtMs = account.connected_at ? account.connected_at.getTime() : 0;

  if (status === "CONNECTING") {
    if (leaseExpiresMs && leaseExpiresMs < nowMs) status = "DISCONNECTED";
    else if ((lastSeenMs && nowMs - lastSeenMs < CONNECTED_RECENT_MS) || (connectedAtMs && nowMs - connectedAtMs < CONNECTED_RECENT_MS)) status = "CONNECTED";
    else if (updatedAtMs && nowMs - updatedAtMs > CONNECTING_STALE_MS) status = "DISCONNECTED";
  }

  return { ...account, status, qr_code: qrCode, clientReady: isClientReady };
}

export async function startOrRestartClient(organizationId: string) {
  resetAlwaysOnBackoff(organizationId);
  if (clients.has(organizationId)) {
    await destroyClient(organizationId, {
      reasonCode: "CLIENT_RESTART",
      detail: "startOrRestartClient: stopping existing runtime before starting a new WhatsApp Web session.",
    });
  }
  return startClientForAccount(organizationId);
}

export async function disconnectClient(organizationId: string) {
  if (clients.has(organizationId)) {
    await destroyClient(organizationId, {
      reasonCode: "ADMIN_DISCONNECT",
      detail: "disconnectClient() — operator or API requested the WhatsApp session to stop.",
    });
  }
  await prisma.whatsapp_account.updateMany({
    where: { organization_id: organizationId },
    data: { status: "DISCONNECTED", qr_code: null, owner_instance_id: null, lease_expires_at: null },
  });
}

export async function clearSessionData(organizationId: string): Promise<void> {
  if (clients.has(organizationId)) {
    await destroyClient(organizationId, {
      reasonCode: "CLEAR_SESSION",
      detail: "clearSessionData() — local/browser session cleared; client stopped.",
    });
  }
  await prisma.whatsapp_account.updateMany({
    where: { organization_id: organizationId },
    data: { status: "DISCONNECTED", qr_code: null, session_data: null, session_saved_at: null, last_error: null, retry_count: 0, next_retry_at: null, owner_instance_id: null, lease_expires_at: null },
  });
}

export async function removeAccount(organizationId: string) {
  await disconnectClient(organizationId);
  await deleteAllOrgData(organizationId).catch(() => {});
  await prisma.whatsapp_account.deleteMany({ where: { organization_id: organizationId } });
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export async function sendMessage(opts: {
  organizationId: string;
  chatId: string; // contact_id (WA JID)
  body: string;
  quotedMessageId?: string;
  clientMessageId?: string;
}) {
  const { organizationId, chatId: contactId, body, quotedMessageId, clientMessageId } = opts;

  if (clientMessageId) {
    const dup = await findMessageByClientId(organizationId, contactId, clientMessageId);
    if (dup) return dup;
  }

  const managed = await getReadyClient(organizationId, "sendMessage");

  const sendOpts: Record<string, unknown> = {};
  if (quotedMessageId) sendOpts.quotedMessageId = quotedMessageId;

  const sentMsg: WAWebJS.Message = await managed.client.sendMessage(contactId, body, sendOpts);
  const mapped = mapWaMessageToRedis(sentMsg, contactId);

  const message = await upsertMessage(organizationId, contactId, {
    ...mapped,
    client_message_id: clientMessageId || null,
    sent_at: new Date().toISOString(),
  });

  await upsertChat(organizationId, {
    contact_id: contactId,
    name: null,
    is_group: false,
    account_id: managed.accountId,
    last_message_at: new Date(),
  });

  recordAnalytics(organizationId, "sent", mapped.type !== "text");
  return message;
}

function parseDataUrl(dataUrl: string): { mime: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) throw new Error("Invalid data URL (expected data:mime;base64,...)");
  return { mime: match[1], base64: match[2] };
}

export async function sendMediaMessage(opts: {
  organizationId: string;
  chatId: string;
  dataUrl: string;
  caption?: string;
  clientMessageId?: string;
}) {
  const { organizationId, chatId: contactId, dataUrl, caption, clientMessageId } = opts;
  if (!dataUrl) throw new Error("Image data is required");

  if (clientMessageId) {
    const dup = await findMessageByClientId(organizationId, contactId, clientMessageId);
    if (dup) return dup;
  }

  const managed = await getReadyClient(organizationId, "sendMediaMessage");

  const { mime, base64 } = parseDataUrl(dataUrl);
  const media = new MessageMedia(mime, base64, "image");
  const sentMsg: WAWebJS.Message = await managed.client.sendMessage(contactId, media, { caption: caption || undefined } as any);
  const mapped = mapWaMessageToRedis(sentMsg, contactId);
  const approxBytes = Math.floor((base64.length * 3) / 4);

  const message = await upsertMessage(organizationId, contactId, {
    ...mapped,
    body: caption || mapped.body,
    media_url: dataUrl,
    mime_type: mime,
    media_size: approxBytes,
    client_message_id: clientMessageId || null,
    sent_at: new Date().toISOString(),
  });

  await upsertChat(organizationId, {
    contact_id: contactId,
    name: null,
    is_group: false,
    account_id: managed.accountId,
    last_message_at: new Date(),
  });

  recordAnalytics(organizationId, "sent", true);
  return message;
}

/** Send a document (e.g. PDF) via WhatsApp; uses sendMediaAsDocument so it is not treated as an image. */
export async function sendDocumentMessage(opts: {
  organizationId: string;
  chatId: string;
  dataUrl: string;
  filename: string;
  caption?: string;
  clientMessageId?: string;
}) {
  const { organizationId, chatId: contactId, dataUrl, filename, caption, clientMessageId } = opts;
  if (!dataUrl) throw new Error("Document data is required");

  if (clientMessageId) {
    const dup = await findMessageByClientId(organizationId, contactId, clientMessageId);
    if (dup) return dup;
  }

  const managed = await getReadyClient(organizationId, "sendDocumentMessage");

  const { mime, base64 } = parseDataUrl(dataUrl);
  const safeName = (filename || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "document.pdf";
  const media = new MessageMedia(mime, base64, safeName);
  const sendOpts: Record<string, unknown> = {
    caption: caption || undefined,
    sendMediaAsDocument: true,
  };
  const sentMsg: WAWebJS.Message = await managed.client.sendMessage(contactId, media, sendOpts as any);
  const mapped = mapWaMessageToRedis(sentMsg, contactId);
  const approxBytes = Math.floor((base64.length * 3) / 4);

  const message = await upsertMessage(organizationId, contactId, {
    ...mapped,
    body: caption || mapped.body,
    media_url: dataUrl,
    mime_type: mime,
    media_size: approxBytes,
    client_message_id: clientMessageId || null,
    sent_at: new Date().toISOString(),
  });

  await upsertChat(organizationId, {
    contact_id: contactId,
    name: null,
    is_group: false,
    account_id: managed.accountId,
    last_message_at: new Date(),
  });

  recordAnalytics(organizationId, "sent", true);
  return message;
}

// ── Phase 1: Messaging+ ──────────────────────────────────────────────────────

export async function forwardMessage(opts: {
  organizationId: string;
  waMessageId: string;
  targetChatIds: string[]; // contact_ids now
}) {
  const { organizationId, waMessageId, targetChatIds } = opts;
  const managed = await getReadyClient(organizationId, "forwardMessage");

  const waMsg = await managed.client.getMessageById(waMessageId);
  if (!waMsg) throw new Error("WhatsApp message not found");

  const results: { chatId: string; success: boolean }[] = [];
  for (const targetContactId of targetChatIds) {
    try {
      const waTargetChat = await managed.client.getChatById(targetContactId);
      await waMsg.forward(waTargetChat as any);
      results.push({ chatId: targetContactId, success: true });
    } catch { results.push({ chatId: targetContactId, success: false }); }
  }
  logger.info("WhatsApp message forwarded", { orgId: organizationId, waMessageId, targetCount: targetChatIds.length, successCount: results.filter((r) => r.success).length });
  return results;
}

export async function starMessage(opts: {
  organizationId: string;
  waMessageId: string;
  starred: boolean;
}) {
  const { organizationId, waMessageId, starred } = opts;
  const managed = await getReadyClient(organizationId, "starMessage");

  const waMsg = await managed.client.getMessageById(waMessageId);
  if (!waMsg) throw new Error("WhatsApp message not found");

  if (starred) await (waMsg as any).star(); else await (waMsg as any).unstar();
  await updateMessageFields(organizationId, waMessageId, { is_starred: starred });
  logger.info("WhatsApp message starred", { orgId: organizationId, waMessageId, starred });
  return { starred };
}

export async function deleteMessage(opts: {
  organizationId: string;
  waMessageId: string;
  everyone: boolean;
}) {
  const { organizationId, waMessageId, everyone } = opts;
  const managed = await getReadyClient(organizationId, "deleteMessage");

  const waMsg = await managed.client.getMessageById(waMessageId);
  if (!waMsg) throw new Error("WhatsApp message not found");

  await (waMsg as any).delete(everyone);
  await updateMessageFields(organizationId, waMessageId, { is_deleted: true });
  logger.info("WhatsApp message deleted", { orgId: organizationId, waMessageId, everyone });
  return { deleted: true };
}

export async function reactToMessage(opts: {
  organizationId: string;
  waMessageId: string;
  emoji: string;
}) {
  const { organizationId, waMessageId, emoji } = opts;
  const managed = await getReadyClient(organizationId, "reactToMessage");

  const waMsg = await managed.client.getMessageById(waMessageId);
  if (!waMsg) throw new Error("WhatsApp message not found");

  await waMsg.react(emoji);
  logger.info("WhatsApp message reaction", { orgId: organizationId, waMessageId, emoji: emoji || "(removed)" });
  return { reacted: true, emoji };
}

export async function getMessageInfo(opts: {
  organizationId: string;
  waMessageId: string;
}) {
  const managed = await getReadyClient(opts.organizationId, "getMessageInfo");

  const waMsg = await managed.client.getMessageById(opts.waMessageId);
  if (!waMsg) throw new Error("WhatsApp message not found");

  const info = await (waMsg as any).getInfo();
  return {
    delivery: Array.isArray(info?.delivery) ? info.delivery : [],
    read: Array.isArray(info?.read) ? info.read : [],
    played: Array.isArray(info?.played) ? info.played : [],
  };
}

// ── Phase 2: Chat management ─────────────────────────────────────────────────

export async function archiveChat(organizationId: string, contactId: string, archive: boolean) {
  const managed = await getReadyClient(organizationId, "archiveChat");
  const waChat = await managed.client.getChatById(contactId);
  if (archive) await (waChat as any).archive(); else await (waChat as any).unarchive();
  await updateChatFields(organizationId, contactId, { is_archived: archive } as any);
  return { archived: archive };
}

export async function pinChat(organizationId: string, contactId: string, pin: boolean) {
  const managed = await getReadyClient(organizationId, "pinChat");
  const waChat = await managed.client.getChatById(contactId);
  if (pin) await (waChat as any).pin(); else await (waChat as any).unpin();
  await updateChatFields(organizationId, contactId, { is_pinned: pin } as any);
  return { pinned: pin };
}

export async function muteChat(organizationId: string, contactId: string, mute: boolean, unmuteDate?: Date) {
  const managed = await getReadyClient(organizationId, "muteChat");
  const waChat = await managed.client.getChatById(contactId);
  if (mute) await (waChat as any).mute(unmuteDate || undefined); else await (waChat as any).unmute();
  await updateChatFields(organizationId, contactId, {
    is_muted: mute,
    mute_expiration: mute && unmuteDate ? unmuteDate.toISOString() : null,
  } as any);
  return { muted: mute };
}

export async function markChatUnread(organizationId: string, contactId: string) {
  const managed = await getReadyClient(organizationId, "markChatUnread");
  const waChat = await managed.client.getChatById(contactId);
  await (waChat as any).markUnread();
  return { unread: true };
}

export async function sendSeenForChat(organizationId: string, contactId: string) {
  const managed = await getReadyClient(organizationId, "sendSeenForChat");
  const waChat = await managed.client.getChatById(contactId);
  await waChat.sendSeen();
  await setChatUnread(organizationId, contactId, 0);
  return { seen: true };
}

export async function getChatLabels(organizationId: string, contactId: string) {
  const managed = await getReadyClient(organizationId, "getChatLabels");
  const waChat = await managed.client.getChatById(contactId);
  try {
    const labels = await (waChat as any).getLabels();
    return Array.isArray(labels) ? labels.map((l: any) => ({ id: l.id, name: l.name, hexColor: l.hexColor })) : [];
  } catch { return []; }
}

export async function updateChatLabels(organizationId: string, contactId: string, labelIds: string[]) {
  const managed = await getReadyClient(organizationId, "updateChatLabels");
  const waChat = await managed.client.getChatById(contactId);
  try { await (waChat as any).changeLabels(labelIds); } catch { /* not all accounts support labels */ }
  return { labels: labelIds };
}

export async function setChatNote(organizationId: string, contactId: string, note: string) {
  // Notes are just local metadata stored in Redis
  await updateChatFields(organizationId, contactId, {} as any);
  return { note };
}

export async function sendTypingState(organizationId: string, contactId: string, typing: boolean) {
  const managed = await getReadyClient(organizationId, "sendTypingState");
  const waChat = await managed.client.getChatById(contactId);
  if (typing) await (waChat as any).sendStateTyping(); else await (waChat as any).clearState();
  return { typing };
}

// ── Phase 3: Groups ──────────────────────────────────────────────────────────

export async function getGroupMetadata(organizationId: string, contactId: string) {
  const managed = await getReadyClient(organizationId, "getGroupMetadata");
  const meta = await getChatMeta(organizationId, contactId);
  if (meta && !meta.is_group) throw new Error("Not a group chat");
  const waChat: any = await managed.client.getChatById(contactId);

  const participants = Array.isArray(waChat.participants)
    ? waChat.participants.map((p: any) => ({ id: p.id?._serialized || p.id, isAdmin: !!p.isAdmin, isSuperAdmin: !!p.isSuperAdmin }))
    : [];

  const jids = participants.map((p: any) => p.id).filter(Boolean);
  const [names, pics] = await Promise.all([
    getContactDisplayNames(organizationId, jids, { managed }),
    getContactProfilePictures(organizationId, jids, { managed }),
  ]);
  const enriched = participants.map((p: any) => ({ ...p, displayName: names[p.id] ?? null, profilePictureUrl: pics[p.id] ?? null }));

  let inviteCode: string | null = null;
  try { inviteCode = await (waChat as any).getInviteCode?.() ?? null; } catch { }

  return {
    name: waChat.name ?? null,
    description: waChat.description ?? null,
    owner: waChat.owner?._serialized ?? null,
    createdAt: waChat.createdAt ? new Date(waChat.createdAt * 1000).toISOString() : null,
    participants: enriched,
    participantCount: participants.length,
    inviteCode,
    isReadOnly: !!(waChat as any).isReadOnly,
    isAnnouncement: waChat.groupMetadata?.announce ?? false,
    isRestrict: waChat.groupMetadata?.restrict ?? false,
  };
}

async function requireGroupChat(organizationId: string, contactId: string) {
  const managed = await getReadyClient(organizationId, "groupChat");
  const meta = await getChatMeta(organizationId, contactId);
  if (meta && !meta.is_group) throw new Error("Not a group chat");
  return managed.client.getChatById(contactId) as Promise<any>;
}

export async function addGroupParticipants(organizationId: string, contactId: string, participantIds: string[]) {
  const waChat = await requireGroupChat(organizationId, contactId);
  return waChat.addParticipants(participantIds);
}

export async function removeGroupParticipants(organizationId: string, contactId: string, participantIds: string[]) {
  const waChat = await requireGroupChat(organizationId, contactId);
  return waChat.removeParticipants(participantIds);
}

export async function promoteGroupParticipants(organizationId: string, contactId: string, participantIds: string[]) {
  const waChat = await requireGroupChat(organizationId, contactId);
  return waChat.promoteParticipants(participantIds);
}

export async function demoteGroupParticipants(organizationId: string, contactId: string, participantIds: string[]) {
  const waChat = await requireGroupChat(organizationId, contactId);
  return waChat.demoteParticipants(participantIds);
}

export async function setGroupSubject(organizationId: string, contactId: string, subject: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  await waChat.setSubject(subject);
  await updateChatFields(organizationId, contactId, { name: subject } as any);
  return { subject };
}

export async function setGroupDescription(organizationId: string, contactId: string, description: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  await waChat.setDescription(description);
  return { description };
}

export async function setGroupSettings(organizationId: string, contactId: string, settings: {
  infoAdminsOnly?: boolean;
  messagesAdminsOnly?: boolean;
  addMembersAdminsOnly?: boolean;
}) {
  const waChat = await requireGroupChat(organizationId, contactId);
  if (settings.infoAdminsOnly !== undefined) await waChat.setInfoAdminsOnly(settings.infoAdminsOnly);
  if (settings.messagesAdminsOnly !== undefined) await waChat.setMessagesAdminsOnly(settings.messagesAdminsOnly);
  if (settings.addMembersAdminsOnly !== undefined && typeof waChat.setAddMembersAdminsOnly === "function") {
    await waChat.setAddMembersAdminsOnly(settings.addMembersAdminsOnly);
  }
  return settings;
}

export async function getGroupInviteCode(organizationId: string, contactId: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  const code = await waChat.getInviteCode();
  return { inviteCode: code, inviteLink: `https://chat.whatsapp.com/${code}` };
}

export async function revokeGroupInvite(organizationId: string, contactId: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  const newCode = await waChat.revokeInvite();
  return { inviteCode: newCode, inviteLink: `https://chat.whatsapp.com/${newCode}` };
}

export async function getGroupMembershipRequests(organizationId: string, contactId: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  try {
    const requests = await waChat.getGroupMembershipRequests();
    return Array.isArray(requests) ? requests.map((r: any) => ({ id: r.id?._serialized || r.id, requestAt: r.addedBy || null })) : [];
  } catch { return []; }
}

export async function approveGroupMembershipRequests(organizationId: string, contactId: string, requesterId: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  return waChat.approveGroupMembershipRequests({ requesterIds: [requesterId] });
}

export async function rejectGroupMembershipRequests(organizationId: string, contactId: string, requesterId: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  return waChat.rejectGroupMembershipRequests({ requesterIds: [requesterId] });
}

export async function leaveGroup(organizationId: string, contactId: string) {
  const waChat = await requireGroupChat(organizationId, contactId);
  await waChat.leave();
  return { left: true };
}

// ── Internal: client lifecycle ────────────────────────────────────────────────

async function ensureClient(organizationId: string): Promise<ManagedClient | null> {
  const existing = clients.get(organizationId);
  if (existing?.ready) return existing;
  /** Initialization in progress — never spawn a second Client for the same org. */
  if (existing && !existing.destroying) return existing;
  if (clients.size >= MAX_ORG_CLIENTS && !clients.has(organizationId)) {
    logger.warn("WhatsApp client limit reached", { limit: MAX_ORG_CLIENTS, orgId: organizationId });
    return null;
  }
  return startClientForAccount(organizationId);
}

function buildNotReadyDetail(
  headline: string,
  account: { status: string; last_error: string | null } | null | undefined,
  managed: ManagedClient | null,
  extra?: string
): string {
  const parts = [headline];
  if (extra) parts.push(extra);
  if (account) {
    parts.push(`db_status=${account.status}`);
    parts.push(account.last_error ? `db_last_error=${account.last_error}` : "db_last_error=(none)");
  } else parts.push("db_account=(none)");
  if (managed) parts.push(`mem_ready=${managed.ready}`, `mem_destroying=${managed.destroying}`);
  else parts.push("mem_client=(none)");
  return parts.join(" | ");
}

/**
 * True when another API instance holds a non-expired lease with a recent heartbeat.
 * Used to avoid false drift / CLIENT_START_FAILED noise when WA runs on one machine and HTTP/WS on others.
 */
function isLeaseHeldByOtherLiveInstance(acc: {
  owner_instance_id: string | null;
  lease_expires_at: Date | null;
  owner_heartbeat_at: Date | null;
} | null | undefined): boolean {
  if (!acc?.owner_instance_id || acc.owner_instance_id === INSTANCE_ID) return false;
  const now = Date.now();
  if (!acc.lease_expires_at || acc.lease_expires_at.getTime() <= now) return false;
  if (!acc.owner_heartbeat_at) return false;
  const hbAge = now - acc.owner_heartbeat_at.getTime();
  const maxHbAge = Math.max(LEASE_TTL_MS + HEARTBEAT_INTERVAL_MS * 3, 120_000);
  return hbAge <= maxHbAge;
}

/** In-process client only if already ready — never starts Chrome or competes for the DB lease. */
export function getManagedClientIfReady(organizationId: string): ManagedClient | null {
  const m = clients.get(organizationId);
  if (m?.ready && !m.destroying) return m;
  return null;
}

function scheduleAlwaysOnReconnect(organizationId: string, reason: string) {
  lastAlwaysOnRecoveryAttempt.set(organizationId, 0);
  const delayMs = bumpAlwaysOnBackoff(organizationId);
  logger.info("WhatsApp always-on: scheduling reconnect", { orgId: organizationId, reason, delayMs });
  void prisma.whatsapp_account
    .findUnique({ where: { organization_id: organizationId }, select: { id: true } })
    .then((acc) => {
      if (acc) void safeUpdateAccountById(acc.id, { next_retry_at: new Date(Date.now() + delayMs) });
    });
  setTimeout(() => {
    void startClientForAccount(organizationId).catch((err) =>
      logger.logError(err, "Always-on reconnect after event failed", { orgId: organizationId })
    );
  }, delayMs);
}

/**
 * Wait until the WhatsApp Web client is ready to accept commands.
 * Always-on orgs get a longer timeout and auto-requeue on failure.
 */
export async function getReadyClient(organizationId: string, context = "api"): Promise<ManagedClient> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { whatsapp_enabled: true, whatsapp_always_on: true },
  });
  if (!org?.whatsapp_enabled) {
    const detail = buildNotReadyDetail("WhatsApp is disabled for this organization", null, clients.get(organizationId) ?? null);
    await recordWhatsAppClientEvent({
      organizationId,
      reasonCode: "WHATSAPP_DISABLED",
      detail: `${detail} (context=${context})`,
      instanceId: INSTANCE_ID,
      alwaysOn: false,
      metadata: { context },
    });
    throw new WhatsAppNotReadyError(
      "WHATSAPP_DISABLED",
      "WhatsApp client not ready: feature is not enabled for this organization",
      detail,
      context
    );
  }

  const accountRow = await prisma.whatsapp_account.findUnique({ where: { organization_id: organizationId } });
  const timeoutMs = org.whatsapp_always_on ? WAIT_READY_ALWAYS_ON_MS : WAIT_READY_MS;
  const deadline = Date.now() + timeoutMs;

  let managed = await ensureClient(organizationId);
  if (!managed) {
    const acc = await prisma.whatsapp_account.findUnique({ where: { organization_id: organizationId } });
    if (acc && isLeaseHeldByOtherLiveInstance(acc)) {
      const detail = buildNotReadyDetail(
        "WhatsApp session is active on another API instance (peer holds lease)",
        acc,
        null,
        `context=${context}`
      );
      throw new WhatsAppNotReadyError(
        "CLIENT_ON_PEER_INSTANCE",
        `WhatsApp client not ready: ${detail}`,
        detail,
        context
      );
    }
    const detail = buildNotReadyDetail(
      "Could not start or attach WhatsApp client (lease denied, max clients, or init exhausted)",
      acc,
      null,
      `context=${context}`
    );
    await recordWhatsAppClientEvent({
      organizationId,
      accountId: accountRow?.id,
      reasonCode: "CLIENT_START_FAILED",
      detail,
      instanceId: INSTANCE_ID,
      alwaysOn: org.whatsapp_always_on,
      metadata: { context },
    });
    if (org.whatsapp_always_on) scheduleAlwaysOnReconnect(organizationId, "CLIENT_START_FAILED");
    throw new WhatsAppNotReadyError("CLIENT_START_FAILED", `WhatsApp client not ready: ${detail}`, detail, context);
  }

  while (!managed.ready && !managed.destroying && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, READY_POLL_MS));
    const m = clients.get(organizationId);
    if (!m) {
      const acc = await prisma.whatsapp_account.findUnique({ where: { organization_id: organizationId } });
      const detail = buildNotReadyDetail("Client disappeared from memory while waiting for ready", acc, null, `context=${context}`);
      await recordWhatsAppClientEvent({
        organizationId,
        accountId: accountRow?.id,
        reasonCode: "CLIENT_GONE_DURING_INIT",
        detail,
        instanceId: INSTANCE_ID,
        alwaysOn: org.whatsapp_always_on,
        metadata: { context },
      });
      if (org.whatsapp_always_on) scheduleAlwaysOnReconnect(organizationId, "CLIENT_GONE_DURING_INIT");
      throw new WhatsAppNotReadyError("CLIENT_GONE_DURING_INIT", `WhatsApp client not ready: ${detail}`, detail, context);
    }
    managed = m;
  }

  if (managed.ready && !managed.destroying) return managed;

  const acc = await prisma.whatsapp_account.findUnique({ where: { organization_id: organizationId } });
  const detail = buildNotReadyDetail(
    `Timed out after ${timeoutMs}ms waiting for WhatsApp Web "ready" (QR pending, auth, or network)`,
    acc,
    managed,
    `context=${context}`
  );
  await recordWhatsAppClientEvent({
    organizationId,
    accountId: accountRow?.id,
    reasonCode: "NOT_READY_TIMEOUT",
    detail,
    instanceId: INSTANCE_ID,
    alwaysOn: org.whatsapp_always_on,
    metadata: { context, timeoutMs },
  });
  if (org.whatsapp_always_on) scheduleAlwaysOnReconnect(organizationId, "NOT_READY_TIMEOUT");
  throw new WhatsAppNotReadyError("NOT_READY_TIMEOUT", `WhatsApp client not ready: ${detail}`, detail, context);
}

export async function startClientForAccount(organizationId: string): Promise<ManagedClient | null> {
  const inflight = startClientInflight.get(organizationId);
  if (inflight) return inflight;
  const p = startClientForAccountImpl(organizationId).finally(() => startClientInflight.delete(organizationId));
  startClientInflight.set(organizationId, p);
  return p;
}

async function startClientForAccountImpl(organizationId: string): Promise<ManagedClient | null> {
  const account = await prisma.whatsapp_account.findUnique({
    where: { organization_id: organizationId },
    include: { organization: { select: { whatsapp_enabled: true } } },
  });
  if (!account || !account.organization.whatsapp_enabled) return null;
  if (clients.size >= MAX_ORG_CLIENTS && !clients.has(organizationId)) {
    logger.warn("WhatsApp client limit reached on start", { limit: MAX_ORG_CLIENTS, orgId: organizationId });
    return null;
  }

  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + LEASE_TTL_MS);
  const updated = await prisma.whatsapp_account.updateMany({
    where: {
      id: account.id,
      OR: [{ owner_instance_id: null }, { owner_instance_id: INSTANCE_ID }, { lease_expires_at: { lt: now } }],
    },
    data: { owner_instance_id: INSTANCE_ID, owner_heartbeat_at: now, lease_expires_at: leaseExpiry, status: "CONNECTING" },
  });
  if (updated.count === 0) {
    logger.warn("Could not acquire lease for WhatsApp account", { accountId: account.id, orgId: organizationId });
    return null;
  }

  const authDataPath = path.resolve(process.env.WHATSAPP_AUTH_DATA_PATH || path.join(process.cwd(), ".wwebjs_auth"));
  await fs.mkdir(authDataPath, { recursive: true }).catch(() => {});

  const store = new PgRemoteAuthStore(prisma);
  const userDataDir = path.join(authDataPath, `RemoteAuth-${account.id}`);
  const puppeteerExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH || "/usr/bin/chromium";
  const minimal = process.env.WHATSAPP_PUPPETEER_MINIMAL === "true";
  const puppeteerArgs = [
    "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
    "--no-first-run", "--disable-extensions", "--window-size=1280,900",
    ...(minimal
      ? ["--single-process", "--no-zygote", "--disable-features=IsolateOrigins,site-per-process"]
      : ["--disable-features=IsolateOrigins,site-per-process", "--disable-background-networking",
         "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows",
         "--disable-breakpad", "--disable-component-extensions-with-background-pages",
         "--disable-default-apps", "--disable-hang-monitor", "--disable-ipc-flooding-protection",
         "--disable-popup-blocking", "--disable-prompt-on-repost", "--disable-renderer-backgrounding",
         "--disable-sync", "--metrics-recording-only", "--mute-audio"]),
  ];

  const puppeteerOptions: Record<string, unknown> = {
    headless: true, args: puppeteerArgs,
    protocolTimeout: PUPPETEER_PROTOCOL_TIMEOUT_MS,
    timeout: PUPPETEER_PROTOCOL_TIMEOUT_MS,
    dumpio: process.env.WHATSAPP_PUPPETEER_DUMPIO === "true",
    executablePath: puppeteerExecutablePath,
  };

  const managed: ManagedClient = {
    client: null as unknown as WAWebJS.Client,
    orgId: organizationId, accountId: account.id,
    qrRetries: 0, ready: false, destroying: false,
  };
  clients.set(organizationId, managed);

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= INIT_RETRY_MAX; attempt++) {
    const client = new Client({
      authStrategy: new RemoteAuth({
        store,
        clientId: account.id,
        backupSyncIntervalMs: 60_000,
        dataPath: authDataPath,
      }),
      authTimeoutMs: AUTH_TIMEOUT_MS,
      takeoverOnConflict: TAKEOVER_ON_CONFLICT,
      puppeteer: puppeteerOptions,
    });
    managed.client = client;
    attachEventHandlers(managed);

    try {
      await client.initialize();
      return managed;
    } catch (err) {
      lastErr = err;
      const formatted = formatUnknownError(err);
      const displayMessage = formatted.message.trim() && formatted.message !== "{}" ? formatted.message : "Initialization failed. Try reconnecting or check server logs.";
      logger.logError(err, "WhatsApp client initialization failed", { orgId: organizationId, accountId: account.id, attempt, maxAttempts: INIT_RETRY_MAX });
      if (isBrowserAlreadyRunningError(err)) {
        await cleanupChromiumLockFiles(userDataDir);
      } else if (isExecutionContextDestroyedError(err) || isIndexedDbCorruptionError(err)) {
        await cleanupRemoteAuthLocalBrowserProfile(userDataDir);
      }
      await safeUpdateAccountById(account.id, {
        status: attempt < INIT_RETRY_MAX ? "CONNECTING" : "ERROR",
        last_error: displayMessage,
        retry_count: attempt,
        next_retry_at: attempt < INIT_RETRY_MAX ? new Date(Date.now() + INIT_RETRY_BASE_MS * attempt) : null,
        owner_instance_id: attempt < INIT_RETRY_MAX ? INSTANCE_ID : null,
        owner_heartbeat_at: attempt < INIT_RETRY_MAX ? new Date() : null,
        lease_expires_at: attempt < INIT_RETRY_MAX ? new Date(Date.now() + LEASE_TTL_MS) : null,
      });
      try { await client.destroy(); } catch { }
      if (attempt < INIT_RETRY_MAX) {
        const delayMs = Math.min(INIT_RETRY_BASE_MS * attempt, 60_000);
        logger.info("WhatsApp init retry scheduled", { orgId: organizationId, accountId: account.id, attempt, nextAttemptInMs: delayMs });
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  clients.delete(organizationId);
  if (lastErr) {
    const formatted = formatUnknownError(lastErr);
    const displayMessage = formatted.message.trim() && formatted.message !== "{}" ? formatted.message : "Initialization failed after retries. Wait a few minutes and try again.";
    const alwaysOn = await prisma.organization.findUnique({ where: { id: organizationId }, select: { whatsapp_always_on: true } });
    const reconnectDelayMs = alwaysOn?.whatsapp_always_on ? bumpAlwaysOnBackoff(organizationId) : ALWAYS_ON_RECONNECT_DELAY_MS;
    await safeUpdateAccountById(account.id, {
      status: "ERROR",
      last_error: displayMessage,
      owner_instance_id: null,
      lease_expires_at: null,
      next_retry_at: alwaysOn?.whatsapp_always_on ? new Date(Date.now() + reconnectDelayMs) : null,
    });
    const nowMs = Date.now();
    const lastIncident = lastInitExhaustedIncidentAt.get(organizationId) ?? 0;
    if (nowMs - lastIncident >= INIT_EXHAUSTED_LOG_COOLDOWN_MS) {
      lastInitExhaustedIncidentAt.set(organizationId, nowMs);
      await recordWhatsAppClientEvent({
        organizationId,
        accountId: account.id,
        reasonCode: "INIT_EXHAUSTED",
        detail: `WhatsApp Web failed to initialize after ${INIT_RETRY_MAX} attempt(s). Last error: ${displayMessage}`,
        instanceId: INSTANCE_ID,
        alwaysOn: !!alwaysOn?.whatsapp_always_on,
        metadata: { attempts: INIT_RETRY_MAX, nextReconnectInMs: alwaysOn?.whatsapp_always_on ? reconnectDelayMs : null },
      });
    } else {
      logger.warn("WhatsApp INIT_EXHAUSTED incident log suppressed (cooldown)", {
        orgId: organizationId,
        cooldownMs: INIT_EXHAUSTED_LOG_COOLDOWN_MS,
      });
    }
    if (alwaysOn?.whatsapp_always_on) {
      lastAlwaysOnRecoveryAttempt.set(organizationId, 0);
      logger.info("WhatsApp always-on: scheduling reconnect after INIT_EXHAUSTED", {
        orgId: organizationId,
        delayMs: reconnectDelayMs,
      });
      setTimeout(() => {
        void startClientForAccount(organizationId).catch((err) =>
          logger.logError(err, "Always-on reconnect after INIT_EXHAUSTED failed", { orgId: organizationId })
        );
      }, reconnectDelayMs);
    }
  }
  return null;
}

function attachEventHandlers(managed: ManagedClient) {
  const { client, orgId, accountId } = managed;

  client.on("qr", async (qr: string) => {
    managed.qrRetries++;
    if (managed.qrRetries > QR_MAX_RETRIES) {
      logger.warn("WhatsApp QR max retries exceeded", { orgId, accountId });
      await prisma.whatsapp_account.update({ where: { id: accountId }, data: { status: "ERROR", last_error: "QR code scan timeout — max retries exceeded", qr_code: null } });
      broadcastToOrg(orgId, { type: "whatsapp:status", data: { status: "auth_failure", error: "QR max retries exceeded" } });
      await destroyClient(orgId, {
        reasonCode: "QR_MAX_RETRIES",
        detail: `QR code was not scanned in time (${QR_MAX_RETRIES} QR rotations). Session stopped.`,
      });
      return;
    }
    await prisma.whatsapp_account.update({ where: { id: accountId }, data: { status: "QR_PENDING", qr_code: qr, qr_updated_at: new Date() } });
    broadcastToOrg(orgId, { type: "whatsapp:status", data: { status: "qr_pending", qr } });
  });

  client.on("authenticated", () => { logger.info("WhatsApp client authenticated", { orgId, accountId }); });

  client.on("ready", async () => {
    managed.ready = true;
    managed.qrRetries = 0;
    resetAlwaysOnBackoff(orgId);
    const info = client.info;
    const phoneNumber = info?.wid?.user || "";
    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: { status: "CONNECTED", connected_at: new Date(), last_seen_at: new Date(), last_error: null, qr_code: null, retry_count: 0, next_retry_at: null, phone_number: phoneNumber || undefined },
    });
    broadcastToOrg(orgId, { type: "whatsapp:status", data: { status: "connected", phoneNumber } });
    broadcastToAdmins({ type: "whatsapp:client_connected", data: { organizationId: orgId, accountId, phoneNumber, connectedAt: new Date().toISOString() } });
    logger.info("WhatsApp client ready", { orgId, accountId, phoneNumber });
    syncAllChats(managed).catch((err) => logger.logError(err, "WhatsApp sync all chats failed", { orgId, accountId }));
  });

  client.on("remote_session_saved", async () => {
    await prisma.whatsapp_account.update({ where: { id: accountId }, data: { session_saved_at: new Date() } });
  });

  client.on("message", async (msg: WAWebJS.Message) => {
    if (managed.destroying) return;
    try { await handleInboundMessage(managed, msg); }
    catch (err) { logger.logError(err, "Error handling inbound WhatsApp message", { orgId, accountId }); }
  });

  client.on("message_create", async (msg: WAWebJS.Message) => {
    if (managed.destroying || !msg.fromMe) return;
    try { await handleOutboundReconciliation(managed, msg); }
    catch (err) { logger.logError(err, "Error reconciling outbound WhatsApp message", { orgId, accountId }); }
  });

  client.on("message_ack", async (msg: WAWebJS.Message, ack: number) => {
    if (managed.destroying) return;
    try { await handleAckUpdate(managed, msg, ack); }
    catch (err) { logger.logError(err, "Error handling WhatsApp message ack", { orgId, accountId }); }
  });

  client.on("message_reaction" as any, async (reaction: any) => {
    if (managed.destroying) return;
    try { await handleReactionEvent(managed, reaction); }
    catch (err) { logger.logError(err, "Error handling WhatsApp reaction", { orgId, accountId }); }
  });

  client.on("disconnected", async (reason: string) => {
    const waReason = String(reason ?? "").trim() || "UNKNOWN";
    const detail = `WhatsApp Web emitted disconnected. Library reason: "${waReason}". Likely causes: logged out elsewhere, network loss, WhatsApp server maintenance, or browser crash.`;
    logger.warn("WhatsApp client disconnected", { orgId, accountId, reason: waReason });
    managed.ready = false;
    const orgRow = await prisma.organization.findUnique({ where: { id: orgId }, select: { whatsapp_always_on: true } });
    await recordWhatsAppClientEvent({
      organizationId: orgId,
      accountId,
      reasonCode: "WA_DISCONNECTED",
      detail,
      waDisconnectReason: waReason,
      instanceId: INSTANCE_ID,
      alwaysOn: !!orgRow?.whatsapp_always_on,
      metadata: { source: "whatsapp-web.js:event:disconnected" },
    });
    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: { status: "DISCONNECTED", last_error: `Disconnected: ${waReason}`, owner_instance_id: null, lease_expires_at: null },
    });
    broadcastToOrg(orgId, { type: "whatsapp:status", data: { status: "disconnected", reason: waReason } });
    broadcastToAdmins({
      type: "whatsapp:client_disconnected",
      data: { organizationId: orgId, reasonCode: "WA_DISCONNECTED", detail, waReason: waReason, at: new Date().toISOString() },
    });
    clients.delete(orgId);
    try {
      await client.destroy();
    } catch (err) {
      logger.logError(err, "WhatsApp client.destroy after disconnected", { orgId, accountId });
    }
    if (orgRow?.whatsapp_always_on) {
      scheduleAlwaysOnReconnect(orgId, "WA_DISCONNECTED");
    }
  });

  client.on("auth_failure", async (msg: string) => {
    const raw = String(msg ?? "").trim() || "unknown";
    const detail = `WhatsApp Web auth_failure: "${raw}". Session is no longer valid — user must scan QR again (or session was revoked).`;
    logger.error("WhatsApp auth failure", { orgId, accountId, error: raw });
    managed.ready = false;
    const orgRow = await prisma.organization.findUnique({ where: { id: orgId }, select: { whatsapp_always_on: true } });
    await recordWhatsAppClientEvent({
      organizationId: orgId,
      accountId,
      reasonCode: "AUTH_FAILURE",
      detail,
      waDisconnectReason: raw,
      instanceId: INSTANCE_ID,
      alwaysOn: !!orgRow?.whatsapp_always_on,
      metadata: { source: "whatsapp-web.js:event:auth_failure" },
    });
    await prisma.whatsapp_account.update({
      where: { id: accountId },
      data: { status: "ERROR", last_error: `Auth failure: ${raw}`, session_data: null, owner_instance_id: null, lease_expires_at: null },
    });
    broadcastToOrg(orgId, { type: "whatsapp:status", data: { status: "auth_failure", error: raw } });
    broadcastToAdmins({
      type: "whatsapp:client_disconnected",
      data: { organizationId: orgId, reasonCode: "AUTH_FAILURE", detail, waReason: raw, at: new Date().toISOString() },
    });
    clients.delete(orgId);
    try {
      await client.destroy();
    } catch (err) {
      logger.logError(err, "WhatsApp client.destroy after auth_failure", { orgId, accountId });
    }
  });

  client.on("change_state", async (state: WAWebJS.WAState) => {
    broadcastToOrg(orgId, { type: "whatsapp:status", data: { status: "state_change", state } });
  });
}

// ── Chat sync (Redis) ─────────────────────────────────────────────────────────

async function syncAllChats(managed: ManagedClient): Promise<void> {
  const { client, accountId, orgId } = managed;
  const chats = await client.getChats();

  for (const waChat of chats) {
    const idSer = waChat.id?._serialized;
    if (!idSer || isStatusOrLidChat(idSer) || (waChat as any).name === "Status") continue;
    const chatData = mapWaChatToRedis(waChat, accountId);
    const lastMsgTs = (waChat as any).timestamp;
    await upsertChat(orgId, {
      ...chatData,
      last_message_at: lastMsgTs ? new Date(lastMsgTs * 1000) : new Date(),
    });
  }

  logger.info("WhatsApp synced all chats to Redis", { orgId, accountId, count: chats.length });
}

// ── Message handling (Redis) ──────────────────────────────────────────────────

function isStatusOrLidChat(contactId: string): boolean {
  const lower = contactId.toLowerCase();
  return lower.endsWith("@lid") || lower.includes("status");
}

type RedisChatMetaBroadcast = RedisChatMeta & {
  display_name: string | null;
  profile_picture_url: string | null;
};

async function enrichChatForBroadcast(
  managed: ManagedClient,
  chat: RedisChatMeta,
  contactId: string
): Promise<RedisChatMetaBroadcast> {
  let display_name: string | null = null;
  let profile_picture_url: string | null = null;
  try {
    const contact: any = await managed.client.getContactById(contactId);
    if (contact) {
      display_name =
        (typeof contact.name === "string" && contact.name.trim() ? contact.name.trim() : null) ||
        (typeof contact.pushname === "string" && contact.pushname.trim() ? contact.pushname.trim() : null) ||
        (typeof contact.shortName === "string" && contact.shortName.trim() ? contact.shortName.trim() : null);
    }
  } catch {
    /* privacy / throttle */
  }
  profile_picture_url = await safeGetProfilePictureUrl(managed, contactId);
  return { ...chat, display_name, profile_picture_url };
}

async function safeGetProfilePictureUrl(managed: ManagedClient, jid: string): Promise<string | null> {
  if (!jid || jid.toLowerCase().includes("@lid")) return null;
  try {
    const fromClient = await (managed.client as any).getProfilePicUrl?.(jid);
    if (typeof fromClient === "string" && fromClient.trim()) return fromClient.trim();
  } catch {
    // Fall back to contact object helpers when WA internal store shape changes.
  }
  try {
    const contact: any = await managed.client.getContactById(jid);
    const fromContact =
      (typeof contact?.getProfilePicUrl === "function" ? await contact.getProfilePicUrl().catch(() => null) : null) ??
      (typeof contact?.profilePicUrl === "string" ? contact.profilePicUrl : null);
    if (typeof fromContact === "string" && fromContact.trim()) return fromContact.trim();
  } catch {
    /* no picture / unavailable */
  }
  return null;
}

export async function getProfilePictureUrlFromReadyClient(organizationId: string, jid: string): Promise<string | null> {
  const managed = getManagedClientIfReady(organizationId);
  if (!managed) return null;
  return safeGetProfilePictureUrl(managed, jid);
}

async function attachInlineMediaIfSmall(
  msg: WAWebJS.Message,
  base: Partial<RedisMessage> & { wa_message_id: string; timestamp: string }
): Promise<Partial<RedisMessage> & { wa_message_id: string; timestamp: string }> {
  if (!(msg as any).hasMedia) return base;
  try {
    const media = await (msg as any).downloadMedia?.();
    if (media?.data && typeof media.data === "string" && typeof media.mimetype === "string") {
      const approxBytes = Math.floor((media.data.length * 3) / 4);
      if (approxBytes <= MAX_INLINE_MEDIA_BYTES) {
        return { ...base, media_url: `data:${media.mimetype};base64,${media.data}`, mime_type: media.mimetype, media_size: approxBytes };
      }
    }
  } catch {
    // Historical media may be unavailable/expired; keep the message metadata.
  }
  return base;
}

async function handleInboundMessage(managed: ManagedClient, msg: WAWebJS.Message) {
  const { orgId, accountId } = managed;
  const waChat = await msg.getChat();
  const contactId = waChat.id?._serialized ?? (msg.fromMe ? msg.to : msg.from);
  if (isStatusOrLidChat(contactId) || (waChat as any).name === "Status") return;

  const chatData = mapWaChatToRedis(waChat, accountId);
  const chat = await upsertChat(orgId, {
    ...chatData,
    last_message_at: new Date(),
    unread_increment: msg.fromMe ? 0 : 1,
  });

  const mapped = mapWaMessageToRedis(msg, contactId);
  let msgData: Partial<RedisMessage> & { wa_message_id: string; timestamp: string } = mapped;
  msgData = await attachInlineMediaIfSmall(msg, msgData);

  const message = await upsertMessage(orgId, contactId, msgData);
  const chatPayload = await enrichChatForBroadcast(managed, chat, contactId);
  broadcastToOrg(orgId, { type: "whatsapp:message", data: { chatId: contactId, message, chat: chatPayload } });
  recordAnalytics(orgId, msg.fromMe ? "sent" : "received", mapped.type !== "text");
}

async function handleOutboundReconciliation(managed: ManagedClient, msg: WAWebJS.Message) {
  const { accountId, orgId } = managed;
  const waChat = await msg.getChat();
  const contactId = waChat.id?._serialized ?? msg.to;
  if (isStatusOrLidChat(contactId) || (waChat as any).name === "Status") return;

  const chatData = mapWaChatToRedis(waChat, accountId);
  const chat = await upsertChat(orgId, { ...chatData, last_message_at: new Date() });

  const mapped = mapWaMessageToRedis(msg, contactId);
  let msgData: any = { ...mapped, sent_at: new Date().toISOString() };
  msgData = await attachInlineMediaIfSmall(msg, msgData);

  const message = await upsertMessage(orgId, contactId, msgData);
  const chatPayload = await enrichChatForBroadcast(managed, chat, contactId);
  broadcastToOrg(orgId, { type: "whatsapp:message", data: { chatId: contactId, message, chat: chatPayload } });
  recordAnalytics(orgId, "sent", mapped.type !== "text");
}

async function handleAckUpdate(managed: ManagedClient, msg: WAWebJS.Message, ack: number) {
  const { orgId } = managed;
  const waMessageId = msg.id._serialized;
  const now = new Date().toISOString();

  const updates: Partial<RedisMessage> = { ack };
  if (ack >= 1 && !msg.fromMe) updates.sent_at = now;
  if (ack >= 2) updates.delivered_at = now;
  if (ack >= 3) updates.read_at = now;

  const updated = await updateMessageFields(orgId, waMessageId, updates);
  if (updated) {
    broadcastToOrg(orgId, {
      type: "whatsapp:message",
      data: { chatId: updated.chat_id, messageId: updated.id, ack, ack_updated_at: now },
    });
    if (ack >= 3 && updated.from_me) {
      const invoiceId = parseInvoiceIdFromWaClientMessageId(updated.client_message_id);
      if (invoiceId) {
        markInvoiceWhatsappPdfSeen(invoiceId, new Date(now)).catch((err) =>
          logger.warn("markInvoiceWhatsappPdfSeen failed", { err, invoiceId }),
        );
      }
    }
  }
}

async function handleReactionEvent(managed: ManagedClient, reaction: any) {
  const { orgId } = managed;
  const waMessageId = reaction?.msgId?._serialized;
  if (!waMessageId) return;

  const msg = await getMessage(orgId, waMessageId);
  if (!msg) return;

  const existing: any[] = JSON.parse(msg.reactions || "[]");
  const senderId = reaction.senderId?._serialized || reaction.senderId || "unknown";
  const emoji = reaction.reaction || "";

  let updated: any[];
  if (!emoji) {
    updated = existing.filter((r: any) => r.senderId !== senderId);
  } else {
    const idx = existing.findIndex((r: any) => r.senderId === senderId);
    if (idx >= 0) { updated = [...existing]; updated[idx] = { emoji, senderId }; }
    else updated = [...existing, { emoji, senderId }];
  }

  await updateMessageFields(orgId, waMessageId, { reactions: JSON.stringify(updated) });
  broadcastToOrg(orgId, { type: "whatsapp:reaction", data: { chatId: msg.chat_id, messageId: msg.id, waMessageId, reactions: updated } });
}

// ── Contact helpers ───────────────────────────────────────────────────────────

export async function getContactDisplayNames(
  organizationId: string,
  jids: string[],
  opts?: { managed?: ManagedClient }
): Promise<Record<string, string>> {
  if (jids.length === 0) return {};
  const managed = opts?.managed ?? getManagedClientIfReady(organizationId);
  if (!managed) return {};
  const out: Record<string, string> = {};
  const unique = [...new Set(jids)].filter((j) => j && !j.toLowerCase().includes("@lid"));
  for (const jid of unique) {
    try {
      const contact = await managed.client.getContactById(jid);
      const name =
        (typeof (contact as any).name === "string" && (contact as any).name.trim() ? (contact as any).name.trim() : null) ||
        (typeof (contact as any).pushname === "string" && (contact as any).pushname.trim() ? (contact as any).pushname.trim() : null) ||
        (typeof (contact as any).shortName === "string" && (contact as any).shortName.trim() ? (contact as any).shortName.trim() : null);
      if (typeof name === "string" && name.trim()) out[jid] = name.trim();
    } catch { }
  }
  return out;
}

export async function getContactProfilePictures(
  organizationId: string,
  jids: string[],
  opts?: { managed?: ManagedClient }
): Promise<Record<string, string>> {
  if (jids.length === 0) return {};
  const managed = opts?.managed ?? getManagedClientIfReady(organizationId);
  if (!managed) return {};
  const out: Record<string, string> = {};
  const unique = [...new Set(jids)].filter((j) => j && !j.toLowerCase().includes("@lid"));
  const pairs = await Promise.all(
    unique.map(async (jid) => {
      try {
        const url = await safeGetProfilePictureUrl(managed, jid);
        return [jid, url] as const;
      } catch {
        return [jid, null] as const;
      }
    })
  );
  for (const [jid, url] of pairs) {
    if (url) out[jid] = url;
  }
  return out;
}

export async function getContactDetails(organizationId: string, jid: string): Promise<Record<string, unknown> | null> {
  if (!jid) return null;
  let managed: ManagedClient;
  try {
    managed = await getReadyClient(organizationId, "getContactDetails");
  } catch (e) {
    if (e instanceof WhatsAppNotReadyError) return null;
    throw e;
  }
  try {
    const contact: any = await managed.client.getContactById(jid);
    const profilePictureUrl = await safeGetProfilePictureUrl(managed, jid);
    const about = typeof contact?.getAbout === "function" ? await contact.getAbout().catch(() => null) : null;
    const countryCode = typeof contact?.getCountryCode === "function" ? await contact.getCountryCode().catch(() => null) : null;
    const formattedNumber = typeof contact?.getFormattedNumber === "function" ? await contact.getFormattedNumber().catch(() => null) : null;
    const commonGroups = typeof contact?.getCommonGroups === "function" ? await contact.getCommonGroups().catch(() => []) : [];
    const chatObj = typeof contact?.getChat === "function" ? await contact.getChat().catch(() => null) : null;
    const displayName =
      (typeof contact?.name === "string" && contact.name.trim() ? contact.name.trim() : null) ||
      (typeof contact?.pushname === "string" && contact.pushname.trim() ? contact.pushname.trim() : null) ||
      (typeof contact?.shortName === "string" && contact.shortName.trim() ? contact.shortName.trim() : null);
    return {
      jid, number: String(jid).split("@")[0] || null, displayName,
      name: contact?.name ?? null, pushname: contact?.pushname ?? null, shortName: contact?.shortName ?? null,
      about: typeof about === "string" ? about : null, countryCode: countryCode ?? null,
      formattedNumber: formattedNumber ?? null, commonGroups: Array.isArray(commonGroups) ? commonGroups : [],
      chatId: (chatObj as any)?.id?._serialized ?? null,
      chatIsMuted: (chatObj as any)?.isMuted ?? null,
      chatIsGroup: !!(chatObj as any)?.isGroup,
      profilePictureUrl: typeof profilePictureUrl === "string" ? profilePictureUrl : null,
      isMe: !!contact?.isMe, isUser: !!contact?.isUser, isGroup: !!contact?.isGroup,
      isWAContact: !!contact?.isWAContact, isMyContact: !!contact?.isMyContact,
      isBusiness: !!contact?.isBusiness, isEnterprise: !!contact?.isEnterprise,
      isBlocked: !!contact?.isBlocked,
      verifiedName: (contact as any)?.verifiedName ?? null, businessProfile: (contact as any)?.businessProfile ?? null,
    };
  } catch { return null; }
}

export async function setContactBlocked(organizationId: string, jid: string, blocked: boolean): Promise<boolean | null> {
  if (!jid) return null;
  let managed: ManagedClient;
  try {
    managed = await getReadyClient(organizationId, "setContactBlocked");
  } catch (e) {
    if (e instanceof WhatsAppNotReadyError) return null;
    throw e;
  }
  try {
    const contact: any = await managed.client.getContactById(jid);
    if (!contact) return null;
    if (blocked) { if (typeof contact.block !== "function") return null; return await contact.block(); }
    if (typeof contact.unblock !== "function") return null;
    return await contact.unblock();
  } catch { return null; }
}

/** Fetch recent message history from WhatsApp and cache in Redis. */
export async function fetchChatHistory(
  organizationId: string,
  contactId: string,
  limit = 50,
  opts?: { includeMedia?: boolean }
): Promise<RedisMessage[]> {
  let managed: ManagedClient;
  try {
    managed = await getReadyClient(organizationId, "fetchChatHistory");
  } catch (e) {
    if (e instanceof WhatsAppNotReadyError) return [];
    throw e;
  }
  try {
    const waChat = await managed.client.getChatById(contactId);
    const waMessages = await waChat.fetchMessages({ limit });
    const saved: RedisMessage[] = [];
    for (const msg of waMessages) {
      const from = (msg as any).from ?? (msg as any).author ?? "";
      if (typeof from === "string" && from.toLowerCase().includes("@lid")) continue;
      const mappedBase = mapWaMessageToRedis(msg, contactId);
      const mapped = opts?.includeMedia ? await attachInlineMediaIfSmall(msg, mappedBase) : mappedBase;
      const stored = await upsertMessage(organizationId, contactId, mapped);
      saved.push(stored);
    }
    return saved;
  } catch (err) {
    logger.logError(err, "WhatsApp fetch chat history failed", { organizationId, contactId });
    return [];
  }
}

// ── Admin helpers ─────────────────────────────────────────────────────────────

export async function getLiveClientsForAdmin(): Promise<LiveClientEntry[]> {
  const accountIds = Array.from(clients.values()).map((m) => m.accountId);
  if (accountIds.length === 0) return [];

  const accounts = await prisma.whatsapp_account.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true, organization_id: true, phone_number: true, status: true,
      connected_at: true, last_seen_at: true,
      organization: { select: { name: true, slug: true, whatsapp_always_on: true } } as any,
    },
  });

  const now = Date.now();
  return (accounts as any[]).map((a) => ({
    organizationId: a.organization_id, accountId: a.id,
    organizationName: a.organization.name, organizationSlug: a.organization.slug,
    phoneNumber: a.phone_number || "", status: a.status,
    connectedAt: a.connected_at?.toISOString() ?? null, lastSeenAt: a.last_seen_at?.toISOString() ?? null,
    runningSinceMs: a.connected_at != null ? Math.max(0, now - a.connected_at.getTime()) : null,
    alwaysOn: !!a.organization.whatsapp_always_on,
  }));
}

// ── Analytics recording ───────────────────────────────────────────────────────

function recordAnalytics(orgId: string, direction: "sent" | "received", isMedia: boolean) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStr = today.toISOString().slice(0, 10);

  prisma.$executeRawUnsafe(
    `INSERT INTO whatsapp_analytics_daily (id, organization_id, day, messages_sent, messages_received, media_sent, media_received)
     VALUES (gen_random_uuid(), $1, $2::date,
       $3::int, $4::int, $5::int, $6::int)
     ON CONFLICT (organization_id, day)
     DO UPDATE SET
       messages_sent = whatsapp_analytics_daily.messages_sent + EXCLUDED.messages_sent,
       messages_received = whatsapp_analytics_daily.messages_received + EXCLUDED.messages_received,
       media_sent = whatsapp_analytics_daily.media_sent + EXCLUDED.media_sent,
       media_received = whatsapp_analytics_daily.media_received + EXCLUDED.media_received,
       updated_at = now()`,
    orgId,
    dayStr,
    direction === "sent" ? 1 : 0,
    direction === "received" ? 1 : 0,
    direction === "sent" && isMedia ? 1 : 0,
    direction === "received" && isMedia ? 1 : 0,
  ).catch((err) => {
    logger.logError(err, "Failed to record WhatsApp analytics", { orgId, direction, isMedia });
  });
}

// ── Client destruction ────────────────────────────────────────────────────────

type DestroyMeta = { reasonCode: string; detail: string; waReason?: string; alwaysOn?: boolean };

async function destroyClient(organizationId: string, meta?: DestroyMeta) {
  const managed = clients.get(organizationId);
  if (!managed) return;
  const accountId = managed.accountId;
  managed.destroying = true;
  managed.ready = false;
  clients.delete(organizationId);
  if (meta) {
    void recordWhatsAppClientEvent({
      organizationId,
      accountId,
      reasonCode: meta.reasonCode,
      detail: meta.detail,
      waDisconnectReason: meta.waReason ?? null,
      instanceId: INSTANCE_ID,
      alwaysOn: meta.alwaysOn ?? false,
      metadata: { source: "destroyClient" },
    });
  }
  broadcastToAdmins({
    type: "whatsapp:client_disconnected",
    data: {
      organizationId,
      reasonCode: meta?.reasonCode,
      detail: meta?.detail,
      at: new Date().toISOString(),
    },
  });
  try {
    await managed.client.destroy();
  } catch (err) {
    logger.logError(err, "Error destroying WhatsApp client", { orgId: organizationId });
  }
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

/**
 * If an org is marked always-on but no live client is running (disconnect, init failure, crash),
 * periodically try to start the client again. Does not touch QR_PENDING flows.
 */
async function recoverAlwaysOnClients() {
  if (alwaysOnRecoveryRunning) return;
  alwaysOnRecoveryRunning = true;
  try {
    const accounts = await prisma.whatsapp_account.findMany({
      where: {
        organization: { whatsapp_enabled: true, whatsapp_always_on: true } as any,
      },
      select: {
        id: true,
        organization_id: true,
        status: true,
        next_retry_at: true,
        owner_instance_id: true,
        lease_expires_at: true,
        owner_heartbeat_at: true,
      },
    });

    const nowMs = Date.now();

    for (const acc of accounts) {
      const orgId = acc.organization_id;

      const running = clients.get(orgId);
      if (running && !running.destroying) {
        continue;
      }

      if (acc.status === "QR_PENDING") continue;
      if (acc.status === "CONNECTING" && acc.lease_expires_at && acc.lease_expires_at.getTime() > nowMs) continue;

      if (acc.status === "CONNECTED" && isLeaseHeldByOtherLiveInstance(acc)) continue;

      if (acc.next_retry_at && acc.next_retry_at.getTime() > nowMs) continue;

      if (clients.size >= MAX_ORG_CLIENTS && !clients.has(orgId)) {
        logger.warn("WhatsApp always-on recovery skipped: max clients", {
          orgId,
          limit: MAX_ORG_CLIENTS,
        });
        continue;
      }

      const last = lastAlwaysOnRecoveryAttempt.get(orgId) ?? 0;
      if (nowMs - last < ALWAYS_ON_RECOVERY_COOLDOWN_MS) continue;

      lastAlwaysOnRecoveryAttempt.set(orgId, nowMs);
      logger.info("WhatsApp always-on: attempting client recovery", {
        orgId,
        accountId: acc.id,
        status: acc.status,
      });
      await startClientForAccount(orgId).catch((err) => {
        logger.logError(err, "WhatsApp always-on recovery start failed", { orgId, accountId: acc.id });
      });
    }
  } catch (err) {
    logger.logError(err, "WhatsApp always-on recovery failed");
  } finally {
    alwaysOnRecoveryRunning = false;
  }
}

/** DB says CONNECTED + always-on but process has no ready client (crash, missed disconnect event). */
async function detectDriftedAlwaysOnClients() {
  const now = Date.now();
  let rows: {
    id: string;
    organization_id: string;
    owner_instance_id: string | null;
    lease_expires_at: Date | null;
    owner_heartbeat_at: Date | null;
  }[];
  try {
    rows = await prisma.whatsapp_account.findMany({
      where: {
        status: "CONNECTED",
        organization: { whatsapp_enabled: true, whatsapp_always_on: true } as any,
      },
      select: {
        id: true,
        organization_id: true,
        owner_instance_id: true,
        lease_expires_at: true,
        owner_heartbeat_at: true,
      },
    });
  } catch (err) {
    logger.logError(err, "WhatsApp drift detection query failed");
    return;
  }

  for (const row of rows) {
    const m = clients.get(row.organization_id);
    if (m?.ready) continue;

    if (isLeaseHeldByOtherLiveInstance(row)) continue;

    const last = lastDriftEventLogged.get(row.organization_id) ?? 0;
    if (now - last < DRIFT_LOG_COOLDOWN_MS) continue;
    lastDriftEventLogged.set(row.organization_id, now);

    const detail = `Drift: DB reports CONNECTED with always-on, but this API process has no ready client (mem=${m ? "starting_or_dead" : "none"}). Starting recovery.`;
    await recordWhatsAppClientEvent({
      organizationId: row.organization_id,
      accountId: row.id,
      reasonCode: "DRIFT_RECOVERY",
      detail,
      instanceId: INSTANCE_ID,
      alwaysOn: true,
      metadata: { memReady: m?.ready ?? false, memDestroying: m?.destroying ?? false },
    });
    lastAlwaysOnRecoveryAttempt.set(row.organization_id, 0);
    void startClientForAccount(row.organization_id).catch((err) =>
      logger.logError(err, "WhatsApp drift recovery start failed", { orgId: row.organization_id })
    );
  }
}

async function runHeartbeat() {
  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + LEASE_TTL_MS);
  for (const [orgId, managed] of clients) {
    try {
      await prisma.whatsapp_account.update({
        where: { id: managed.accountId },
        data: { owner_heartbeat_at: now, lease_expires_at: leaseExpiry, last_seen_at: managed.ready ? now : undefined },
      });
    } catch (err) { logger.logError(err, "WhatsApp heartbeat failed", { orgId }); }
  }
  void recoverAlwaysOnClients();
  void detectDriftedAlwaysOnClients();
}

export function shutdownWhatsAppManager() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  const destroyPromises: Promise<void>[] = [];
  for (const [orgId] of clients) {
    destroyPromises.push(
      destroyClient(orgId, {
        reasonCode: "API_SHUTDOWN",
        detail: "API process shutdown (deploy/restart) — in-memory WhatsApp clients destroyed.",
      })
    );
  }
  return Promise.allSettled(destroyPromises);
}
