import { Server as HttpServer, IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseUrl } from "node:url";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/config.js";
import { prisma } from "./prisma.js";
import {
  consumeLiveToken,
  subscribeClient as legacySubscribe,
  unsubscribeClient as legacyUnsubscribe,
  setAnalyticsBroadcaster,
  getLiveCount,
  getLivePages,
} from "./analytics-live.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  userName: string;
  userImage?: string;
  userRole: string;
  organizationIds: string[];
  channels: Set<string>;
  lastPing: number;
  activitySessionId: string | null;
}

interface WsMessage {
  type: string;
  data?: any;
  channel?: string;
}

// ── State ────────────────────────────────────────────────────────────────────

const clientsByUser = new Map<string, Set<ConnectedClient>>();
const clientsByChannel = new Map<string, Set<ConnectedClient>>();
const allClients = new Set<ConnectedClient>();

// ── Broadcast API (exported for use from any route) ─────────────────────────

export function broadcastToUser(userId: string, message: WsMessage): void {
  const clients = clientsByUser.get(userId);
  if (!clients) return;
  const payload = JSON.stringify(message);
  for (const c of clients) {
    safeSend(c.ws, payload);
  }
}

export function broadcastToChannel(channel: string, message: WsMessage, excludeUserId?: string): void {
  const clients = clientsByChannel.get(channel);
  if (!clients) return;
  const payload = JSON.stringify(message);
  for (const c of clients) {
    if (excludeUserId && c.userId === excludeUserId) continue;
    safeSend(c.ws, payload);
  }
}

export function broadcastToOrg(orgId: string, message: WsMessage, excludeUserId?: string): void {
  broadcastToChannel(`org:${orgId}`, message, excludeUserId);
}

export function broadcastToAdmins(message: WsMessage): void {
  broadcastToChannel("admin:all", message);
}

export function broadcastToTicket(ticketId: string, message: WsMessage, excludeUserId?: string): void {
  broadcastToChannel(`support:${ticketId}`, message, excludeUserId);
}

export function getOnlineUserIds(): string[] {
  return Array.from(clientsByUser.keys());
}

export function getOnlineUsersForOrg(orgId: string): Array<{ userId: string; name: string; image?: string }> {
  const clients = clientsByChannel.get(`org:${orgId}`);
  if (!clients) return [];
  const seen = new Set<string>();
  const result: Array<{ userId: string; name: string; image?: string }> = [];
  for (const c of clients) {
    if (!seen.has(c.userId)) {
      seen.add(c.userId);
      result.push({ userId: c.userId, name: c.userName, image: c.userImage });
    }
  }
  return result;
}

// ── Setup ────────────────────────────────────────────────────────────────────

export function attachRealtimeWS(httpServer: HttpServer): void {
  setAnalyticsBroadcaster(broadcastToChannel);
  const wss = new WebSocketServer({ noServer: true });

  // Also keep legacy analytics-live WS path working
  const legacyWss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (request: IncomingMessage, socket, head) => {
    const { pathname, query: queryStr } = parseUrl(request.url || "");

    // Legacy analytics-live path
    if (pathname === "/ws/analytics-live") {
      const params = new URLSearchParams(queryStr || "");
      const token = params.get("token");
      const websiteId = params.get("websiteId");
      if (!token || !websiteId) { socket.write("HTTP/1.1 400 Bad Request\r\n\r\n"); socket.destroy(); return; }
      const data = consumeLiveToken(token);
      if (!data || data.websiteId !== websiteId) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }
      legacyWss.handleUpgrade(request, socket, head, (ws) => {
        legacySubscribe(websiteId, ws);
        ws.on("close", () => legacyUnsubscribe(websiteId, ws));
        ws.on("error", () => legacyUnsubscribe(websiteId, ws));
      });
      return;
    }

    // Unified realtime path
    if (pathname !== "/ws/realtime") {
      socket.destroy();
      return;
    }

    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(Object.fromEntries(
          Object.entries(request.headers).filter(([, v]) => v !== undefined) as [string, string][]
        )),
      });
      if (!session?.user?.id) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const user = session.user;
      const memberships = await prisma.member.findMany({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      const orgIds = memberships.map((m) => m.organizationId);

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, user, orgIds);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  legacyWss.on("connection", () => {});

  wss.on("connection", (ws: WebSocket, user: any, orgIds: string[]) => {
    const client: ConnectedClient = {
      ws,
      userId: user.id,
      userName: user.name || "User",
      userImage: user.image || undefined,
      userRole: user.role || "user",
      organizationIds: orgIds,
      channels: new Set(),
      lastPing: Date.now(),
      activitySessionId: null,
    };

    // Register client
    allClients.add(client);
    if (!clientsByUser.has(user.id)) clientsByUser.set(user.id, new Set());
    clientsByUser.get(user.id)!.add(client);

    // Auto-subscribe to personal channel
    subscribe(client, `user:${user.id}`);

    // Auto-subscribe to org channels
    for (const orgId of orgIds) {
      subscribe(client, `org:${orgId}`);
    }

    // Admin gets admin channel
    if (user.role === "admin") {
      subscribe(client, "admin:all");
    }

    // Start activity session
    startActivitySession(client);

    // Broadcast presence to org channels
    broadcastPresence(client, "online");

    // Send initial online users for each org
    for (const orgId of orgIds) {
      const onlineUsers = getOnlineUsersForOrg(orgId);
      safeSend(ws, JSON.stringify({
        type: "presence:list",
        data: { orgId, users: onlineUsers },
      }));
    }

    // If admin, send all online users
    if (user.role === "admin") {
      const allOnline = Array.from(clientsByUser.entries()).map(([uid, clients]) => {
        const first = clients.values().next().value;
        return first ? { userId: uid, name: first.userName, image: first.userImage } : null;
      }).filter(Boolean);
      safeSend(ws, JSON.stringify({
        type: "presence:all",
        data: { users: allOnline },
      }));
    }

    // Handle messages
    ws.on("message", (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        handleClientMessage(client, msg);
      } catch {}
    });

    ws.on("close", () => handleDisconnect(client));
    ws.on("error", () => handleDisconnect(client));
  });

  // Heartbeat check: disconnect clients that haven't pinged in 90s
  setInterval(() => {
    const now = Date.now();
    for (const client of allClients) {
      if (now - client.lastPing > 90_000) {
        try { client.ws.close(); } catch {}
        handleDisconnect(client);
      }
    }
  }, 30_000);
}

// ── Message Handling ─────────────────────────────────────────────────────────

function handleClientMessage(client: ConnectedClient, msg: WsMessage): void {
  switch (msg.type) {
    case "ping":
      client.lastPing = Date.now();
      safeSend(client.ws, JSON.stringify({ type: "pong" }));
      break;

    case "subscribe":
      if (msg.channel && canSubscribe(client, msg.channel)) {
        subscribe(client, msg.channel);
        // When subscribing to analytics channel, send current live state immediately
        if (msg.channel.startsWith("analytics:")) {
          const websiteId = msg.channel.slice("analytics:".length);
          const live = getLiveCount(websiteId);
          const pages = getLivePages(websiteId);
          safeSend(client.ws, JSON.stringify({
            type: "analytics:live",
            data: { websiteId, live, pages },
          }));
        }
      }
      break;

    case "unsubscribe":
      if (msg.channel) {
        unsubscribe(client, msg.channel);
      }
      break;

    case "activity:heartbeat":
      client.lastPing = Date.now();
      handleActivityHeartbeat(client);
      break;

    case "support:typing":
      if (msg.data?.ticketId && client.channels.has(`support:${msg.data.ticketId}`)) {
        broadcastToChannel(`support:${msg.data.ticketId}`, {
          type: "support:typing",
          data: { ticketId: msg.data.ticketId, userId: client.userId, name: client.userName },
        }, client.userId);
      }
      break;
  }
}

function canSubscribe(client: ConnectedClient, channel: string): boolean {
  if (channel.startsWith("support:")) return true;
  if (channel.startsWith("analytics:")) {
    return client.userRole === "admin" || client.organizationIds.length > 0;
  }
  return false;
}

// ── Channel Management ───────────────────────────────────────────────────────

function subscribe(client: ConnectedClient, channel: string): void {
  client.channels.add(channel);
  if (!clientsByChannel.has(channel)) clientsByChannel.set(channel, new Set());
  clientsByChannel.get(channel)!.add(client);
}

function unsubscribe(client: ConnectedClient, channel: string): void {
  client.channels.delete(channel);
  const set = clientsByChannel.get(channel);
  if (set) {
    set.delete(client);
    if (set.size === 0) clientsByChannel.delete(channel);
  }
}

// ── Disconnect ───────────────────────────────────────────────────────────────

function handleDisconnect(client: ConnectedClient): void {
  if (!allClients.has(client)) return;
  allClients.delete(client);

  // Remove from user map
  const userClients = clientsByUser.get(client.userId);
  if (userClients) {
    userClients.delete(client);
    if (userClients.size === 0) clientsByUser.delete(client.userId);
  }

  // Remove from channels
  for (const channel of client.channels) {
    const set = clientsByChannel.get(channel);
    if (set) {
      set.delete(client);
      if (set.size === 0) clientsByChannel.delete(channel);
    }
  }

  // If this was the user's last connection, broadcast offline
  if (!clientsByUser.has(client.userId)) {
    broadcastPresence(client, "offline");
  }

  // End activity session
  endActivitySession(client);
}

// ── Presence ─────────────────────────────────────────────────────────────────

function broadcastPresence(client: ConnectedClient, status: "online" | "offline"): void {
  const now = new Date().toISOString();
  const presenceData = {
    userId: client.userId,
    name: client.userName,
    image: client.userImage,
    status,
    lastSeenAt: now,
  };

  for (const orgId of client.organizationIds) {
    broadcastToChannel(`org:${orgId}`, {
      type: "presence:update",
      data: { orgId, ...presenceData },
    }, status === "online" ? undefined : undefined);
  }

  // Also notify admins
  broadcastToAdmins({
    type: "presence:update",
    data: { ...presenceData },
  });

  // Update lastSeenAt in DB (fire and forget)
  prisma.user.update({
    where: { id: client.userId },
    data: { lastSeenAt: new Date() },
  }).catch(() => {});
}

// ── Activity Tracking ────────────────────────────────────────────────────────

async function startActivitySession(client: ConnectedClient): Promise<void> {
  try {
    const now = new Date();
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const row = await prisma.dashboard_activity.create({
      data: {
        user_id: client.userId,
        session_start: now,
        date: dateOnly,
        duration_ms: 0,
      },
    });
    client.activitySessionId = row.id;
  } catch {}
}

function handleActivityHeartbeat(client: ConnectedClient): void {
  if (!client.activitySessionId) return;
  // Accumulate 30s of activity per heartbeat
  prisma.dashboard_activity.update({
    where: { id: client.activitySessionId },
    data: { duration_ms: { increment: 30_000 }, session_end: new Date() },
  }).catch(() => {});

  prisma.user.update({
    where: { id: client.userId },
    data: { lastSeenAt: new Date() },
  }).catch(() => {});
}

async function endActivitySession(client: ConnectedClient): Promise<void> {
  if (!client.activitySessionId) return;
  try {
    await prisma.dashboard_activity.update({
      where: { id: client.activitySessionId },
      data: { session_end: new Date() },
    });
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeSend(ws: WebSocket, payload: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(payload); } catch {}
  }
}
