/**
 * In-memory state for analytics live viewer counts.
 * Go service pushes updates via POST /api/analytics/live-update.
 * Dashboard clients subscribe via WebSocket and receive broadcasts.
 */
import { WebSocket } from "ws";
import { randomBytes } from "node:crypto";

type BroadcastFn = (channel: string, message: { type: string; data: any }) => void;
let _broadcastToChannel: BroadcastFn | null = null;

export function setAnalyticsBroadcaster(fn: BroadcastFn): void {
  _broadcastToChannel = fn;
}

// Current live count per websiteId (from Go)
const liveCountByWebsite = new Map<string, number>();

// Dashboard WebSocket clients subscribed per websiteId
const clientsByWebsite = new Map<string, Set<WebSocket>>();

// Short-lived tokens for WS auth: token -> { websiteId, userId, exp }
const tokenStore = new Map<
  string,
  { websiteId: string; userId: string; exp: number }
>();

const TOKEN_TTL_MS = 60 * 1000; // 1 minute

function randomToken(): string {
  return randomBytes(32).toString("hex");
}

export function createLiveToken(websiteId: string, userId: string): { token: string; exp: number } {
  const token = randomToken();
  const exp = Date.now() + TOKEN_TTL_MS;
  tokenStore.set(token, { websiteId, userId, exp });
  // Prune expired
  for (const [t, data] of tokenStore.entries()) {
    if (data.exp < Date.now()) tokenStore.delete(t);
  }
  return { token, exp };
}

export function consumeLiveToken(
  token: string
): { websiteId: string; userId: string } | null {
  const data = tokenStore.get(token);
  if (!data || data.exp < Date.now()) return null;
  tokenStore.delete(token);
  return { websiteId: data.websiteId, userId: data.userId };
}

export function setLiveCount(websiteId: string, count: number): void {
  liveCountByWebsite.set(websiteId, count);

  // Broadcast to unified WS subscribers
  if (_broadcastToChannel) {
    _broadcastToChannel(`analytics:${websiteId}`, {
      type: "analytics:live",
      data: { websiteId, live: count },
    });
  }

  // Legacy WS clients
  const clients = clientsByWebsite.get(websiteId);
  if (!clients) return;
  const payload = JSON.stringify({ type: "live_count", data: { live: count } });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch {
        clients.delete(ws);
      }
    }
  }
}

export function getLiveCount(websiteId: string): number {
  return liveCountByWebsite.get(websiteId) ?? 0;
}

export function subscribeClient(websiteId: string, ws: WebSocket): void {
  if (!clientsByWebsite.has(websiteId)) {
    clientsByWebsite.set(websiteId, new Set());
  }
  clientsByWebsite.get(websiteId)!.add(ws);
  const count = getLiveCount(websiteId);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "live_count", data: { live: count } }));
  }
}

export function unsubscribeClient(websiteId: string, ws: WebSocket): void {
  const clients = clientsByWebsite.get(websiteId);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) clientsByWebsite.delete(websiteId);
  }
}
