/**
 * Redis-only runtime store for WhatsApp chats and messages.
 * All keys have a 7-day TTL refreshed on write.
 * No disk persistence assumed — WhatsApp is the source of truth.
 */
import { getRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_MESSAGES_PER_CHAT = 500;

// ── Key helpers ──────────────────────────────────────────────────────────────

function chatListKey(orgId: string) { return `wa:${orgId}:chatlist`; }
function chatMetaKey(orgId: string, contactId: string) { return `wa:${orgId}:chat:${contactId}:meta`; }
function chatMsgsKey(orgId: string, contactId: string) { return `wa:${orgId}:msgs:${contactId}`; }
function msgDataKey(orgId: string, waMessageId: string) { return `wa:${orgId}:msg:${waMessageId}`; }
function unreadHashKey(orgId: string) { return `wa:${orgId}:unread`; }

// ── Redis guard ──────────────────────────────────────────────────────────────

async function requireRedis() {
  const redis = await getRedisClient();
  if (!redis) throw new Error("Redis is required for WhatsApp runtime but is unavailable. Set REDIS_URL.");
  return redis;
}

export async function isRedisAvailable(): Promise<boolean> {
  const redis = await getRedisClient();
  return redis !== null;
}

// ── Flatten / parse helpers ──────────────────────────────────────────────────

function flatten(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
}

// ── Chat types ───────────────────────────────────────────────────────────────

export interface RedisChatMeta {
  id: string;
  contact_id: string;
  name: string;
  is_group: boolean;
  unread_count: number;
  is_archived: boolean;
  is_muted: boolean;
  is_pinned: boolean;
  mute_expiration: string | null;
  last_message_at: string;
  account_id: string;
}

function parseChat(raw: Record<string, string>): RedisChatMeta | null {
  if (!raw || !raw.contact_id) return null;
  return {
    id: raw.contact_id,
    contact_id: raw.contact_id,
    name: raw.name || "",
    is_group: raw.is_group === "true",
    unread_count: parseInt(raw.unread_count || "0", 10),
    is_archived: raw.is_archived === "true",
    is_muted: raw.is_muted === "true",
    is_pinned: raw.is_pinned === "true",
    mute_expiration: raw.mute_expiration || null,
    last_message_at: raw.last_message_at || "",
    account_id: raw.account_id || "",
  };
}

// ── Chat operations ──────────────────────────────────────────────────────────

export async function upsertChat(orgId: string, data: {
  contact_id: string;
  name: string | null;
  is_group: boolean;
  account_id: string;
  last_message_at?: Date;
  unread_increment?: number;
}): Promise<RedisChatMeta> {
  const redis = await requireRedis();
  const key = chatMetaKey(orgId, data.contact_id);
  const now = data.last_message_at ?? new Date();

  const existing = await redis.hGetAll(key);
  const isNew = !existing || Object.keys(existing).length === 0;

  const meta: RedisChatMeta = isNew
    ? {
        id: data.contact_id,
        contact_id: data.contact_id,
        name: data.name || "",
        is_group: data.is_group,
        unread_count: data.unread_increment ?? 0,
        is_archived: false,
        is_muted: false,
        is_pinned: false,
        mute_expiration: null,
        last_message_at: now.toISOString(),
        account_id: data.account_id,
      }
    : {
        id: data.contact_id,
        contact_id: data.contact_id,
        name: data.name || existing.name || "",
        is_group: existing.is_group === "true" || data.is_group,
        unread_count: parseInt(existing.unread_count || "0", 10) + (data.unread_increment ?? 0),
        is_archived: existing.is_archived === "true",
        is_muted: existing.is_muted === "true",
        is_pinned: existing.is_pinned === "true",
        mute_expiration: existing.mute_expiration || null,
        last_message_at: now.toISOString(),
        account_id: existing.account_id || data.account_id,
      };

  await redis.hSet(key, flatten(meta as any));
  await redis.expire(key, TTL_SECONDS);
  await redis.zAdd(chatListKey(orgId), { score: now.getTime(), value: data.contact_id });
  await redis.expire(chatListKey(orgId), TTL_SECONDS);
  await redis.hSet(unreadHashKey(orgId), data.contact_id, String(meta.unread_count));
  await redis.expire(unreadHashKey(orgId), TTL_SECONDS);

  return meta;
}

export async function getChatMeta(orgId: string, contactId: string): Promise<RedisChatMeta | null> {
  const redis = await requireRedis();
  const raw = await redis.hGetAll(chatMetaKey(orgId, contactId));
  return parseChat(raw);
}

export async function updateChatFields(orgId: string, contactId: string, fields: Partial<RedisChatMeta>): Promise<void> {
  const redis = await requireRedis();
  const key = chatMetaKey(orgId, contactId);
  await redis.hSet(key, flatten(fields as any));
  await redis.expire(key, TTL_SECONDS);
}

export async function setChatUnread(orgId: string, contactId: string, count: number): Promise<void> {
  const redis = await requireRedis();
  await redis.hSet(chatMetaKey(orgId, contactId), "unread_count", String(count));
  await redis.hSet(unreadHashKey(orgId), contactId, String(count));
}

export async function getChats(orgId: string, opts: {
  offset: number;
  limit: number;
  search?: string;
  unreadOnly?: boolean;
}): Promise<{ chats: RedisChatMeta[]; total: number }> {
  const redis = await requireRedis();
  const all = await redis.zRange(chatListKey(orgId), "+inf", "-inf", {
    BY: "SCORE", REV: true, LIMIT: { offset: 0, count: 2000 },
  });

  const filtered: RedisChatMeta[] = [];
  for (const cid of all) {
    const lower = cid.toLowerCase();
    if (lower.endsWith("@lid") || lower.includes("status")) continue;

    const meta = await getChatMeta(orgId, cid);
    if (!meta) continue;
    if (opts.unreadOnly && meta.unread_count <= 0) continue;
    if (opts.search) {
      const s = opts.search.toLowerCase();
      if (!(meta.name || "").toLowerCase().includes(s) && !meta.contact_id.toLowerCase().includes(s)) continue;
    }
    filtered.push(meta);
  }

  return { chats: filtered.slice(opts.offset, opts.offset + opts.limit), total: filtered.length };
}

export async function getTotalUnread(orgId: string): Promise<number> {
  const redis = await requireRedis();
  const map = await redis.hGetAll(unreadHashKey(orgId));
  let sum = 0;
  for (const v of Object.values(map)) sum += parseInt(v || "0", 10);
  return sum;
}

export async function deleteChatFromList(orgId: string, contactId: string): Promise<void> {
  const redis = await requireRedis();
  await redis.zRem(chatListKey(orgId), contactId);
  await redis.del(chatMetaKey(orgId, contactId));
  await redis.hDel(unreadHashKey(orgId), contactId);
}

// ── Message types ────────────────────────────────────────────────────────────

export interface RedisMessage {
  id: string;
  chat_id: string;
  wa_message_id: string;
  client_message_id: string | null;
  from_me: boolean;
  from_number: string | null;
  body: string | null;
  type: string;
  media_url: string | null;
  mime_type: string | null;
  media_size: number | null;
  quoted_wa_message_id: string | null;
  quoted_body: string | null;
  quoted_from: string | null;
  is_starred: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  reactions: string;
  timestamp: string;
  ack: number;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

// ── Message operations ───────────────────────────────────────────────────────

export async function upsertMessage(
  orgId: string,
  contactId: string,
  partial: Partial<RedisMessage> & { wa_message_id: string; timestamp: string },
): Promise<RedisMessage> {
  const redis = await requireRedis();
  const dk = msgDataKey(orgId, partial.wa_message_id);

  const existing = await redis.get(dk);
  if (existing) {
    const parsed: RedisMessage = JSON.parse(existing);
    for (const [k, v] of Object.entries(partial)) {
      if (v !== undefined && v !== null) (parsed as any)[k] = v;
    }
    await redis.setEx(dk, TTL_SECONDS, JSON.stringify(parsed));
    return parsed;
  }

  const now = new Date().toISOString();
  const full: RedisMessage = {
    id: partial.wa_message_id,
    chat_id: contactId,
    wa_message_id: partial.wa_message_id,
    client_message_id: partial.client_message_id ?? null,
    from_me: partial.from_me ?? false,
    from_number: partial.from_number ?? null,
    body: partial.body ?? null,
    type: partial.type ?? "text",
    media_url: partial.media_url ?? null,
    mime_type: partial.mime_type ?? null,
    media_size: partial.media_size ?? null,
    quoted_wa_message_id: partial.quoted_wa_message_id ?? null,
    quoted_body: partial.quoted_body ?? null,
    quoted_from: partial.quoted_from ?? null,
    is_starred: partial.is_starred ?? false,
    is_pinned: partial.is_pinned ?? false,
    is_deleted: partial.is_deleted ?? false,
    reactions: partial.reactions ?? "[]",
    timestamp: partial.timestamp,
    ack: partial.ack ?? 0,
    sent_at: partial.sent_at ?? null,
    delivered_at: partial.delivered_at ?? null,
    read_at: partial.read_at ?? null,
    created_at: partial.created_at ?? now,
  };

  await redis.setEx(dk, TTL_SECONDS, JSON.stringify(full));

  const msgsKey = chatMsgsKey(orgId, contactId);
  await redis.zAdd(msgsKey, { score: new Date(partial.timestamp).getTime(), value: partial.wa_message_id });
  await redis.expire(msgsKey, TTL_SECONDS);

  const count = await redis.zCard(msgsKey);
  if (count > MAX_MESSAGES_PER_CHAT) {
    const stale = await redis.zRange(msgsKey, 0, count - MAX_MESSAGES_PER_CHAT - 1);
    if (stale.length > 0) {
      await redis.zRemRangeByRank(msgsKey, 0, count - MAX_MESSAGES_PER_CHAT - 1);
      const pipe = redis.multi();
      for (const id of stale) pipe.del(msgDataKey(orgId, id));
      await pipe.exec();
    }
  }

  return full;
}

export async function getMessage(orgId: string, waMessageId: string): Promise<RedisMessage | null> {
  const redis = await requireRedis();
  const raw = await redis.get(msgDataKey(orgId, waMessageId));
  return raw ? JSON.parse(raw) : null;
}

export async function updateMessageFields(orgId: string, waMessageId: string, updates: Partial<RedisMessage>): Promise<RedisMessage | null> {
  const redis = await requireRedis();
  const dk = msgDataKey(orgId, waMessageId);
  const raw = await redis.get(dk);
  if (!raw) return null;
  const msg: RedisMessage = JSON.parse(raw);
  Object.assign(msg, updates);
  await redis.setEx(dk, TTL_SECONDS, JSON.stringify(msg));
  return msg;
}

export async function getMessages(orgId: string, contactId: string, opts: {
  limit: number;
  beforeTimestamp?: number;
}): Promise<{ messages: RedisMessage[]; hasMore: boolean }> {
  const redis = await requireRedis();
  const sk = chatMsgsKey(orgId, contactId);

  const maxScore = opts.beforeTimestamp != null ? String(opts.beforeTimestamp - 1) : "+inf";
  const ids = await redis.zRange(sk, maxScore, "-inf", {
    BY: "SCORE", REV: true, LIMIT: { offset: 0, count: opts.limit + 1 },
  });

  const hasMore = ids.length > opts.limit;
  if (hasMore) ids.pop();

  const messages: RedisMessage[] = [];
  for (const wid of ids) {
    const raw = await redis.get(msgDataKey(orgId, wid));
    if (raw) messages.push(JSON.parse(raw));
  }

  messages.reverse();
  return { messages, hasMore };
}

export async function findMessageByClientId(orgId: string, contactId: string, clientMessageId: string): Promise<RedisMessage | null> {
  const redis = await requireRedis();
  const ids = await redis.zRange(chatMsgsKey(orgId, contactId), "+inf", "-inf", {
    BY: "SCORE", REV: true, LIMIT: { offset: 0, count: 100 },
  });
  for (const wid of ids) {
    const raw = await redis.get(msgDataKey(orgId, wid));
    if (raw) {
      const msg: RedisMessage = JSON.parse(raw);
      if (msg.client_message_id === clientMessageId) return msg;
    }
  }
  return null;
}

export async function getLastMessage(orgId: string, contactId: string): Promise<RedisMessage | null> {
  const redis = await requireRedis();
  const ids = await redis.zRange(chatMsgsKey(orgId, contactId), "+inf", "-inf", {
    BY: "SCORE", REV: true, LIMIT: { offset: 0, count: 1 },
  });
  if (ids.length === 0) return null;
  const raw = await redis.get(msgDataKey(orgId, ids[0]));
  return raw ? JSON.parse(raw) : null;
}

export async function getChatMessageCount(orgId: string, contactId: string): Promise<number> {
  const redis = await requireRedis();
  return redis.zCard(chatMsgsKey(orgId, contactId));
}

// ── Bulk cleanup ─────────────────────────────────────────────────────────────

export async function deleteAllOrgData(orgId: string): Promise<void> {
  const redis = await requireRedis();
  const contactIds = await redis.zRange(chatListKey(orgId), 0, -1);

  for (const cid of contactIds) {
    const msgIds = await redis.zRange(chatMsgsKey(orgId, cid), 0, -1).catch(() => [] as string[]);
    if (msgIds.length > 0) {
      const pipe = redis.multi();
      for (const mid of msgIds) pipe.del(msgDataKey(orgId, mid));
      await pipe.exec().catch(() => {});
    }
    await redis.del(chatMsgsKey(orgId, cid));
    await redis.del(chatMetaKey(orgId, cid));
  }

  await redis.del(chatListKey(orgId));
  await redis.del(unreadHashKey(orgId));
}
