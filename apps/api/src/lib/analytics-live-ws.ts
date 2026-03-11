import { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";
import type { IncomingMessage } from "node:http";
import { parse as parseUrl } from "node:url";
import {
  consumeLiveToken,
  subscribeClient,
  unsubscribeClient,
} from "./analytics-live.js";

export function attachAnalyticsLiveWS(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request: IncomingMessage, socket, head) => {
    const pathname = parseUrl(request.url || "").pathname;
    if (pathname !== "/ws/analytics-live") {
      socket.destroy();
      return;
    }

    const params = new URLSearchParams(parseUrl(request.url || "").query || "");
    const token = params.get("token");
    const websiteId = params.get("websiteId");

    if (!token || !websiteId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const data = consumeLiveToken(token);
    if (!data || data.websiteId !== websiteId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, websiteId);
    });
  });

  wss.on("connection", (ws: import("ws").WebSocket, _req, websiteId: string) => {
    subscribeClient(websiteId, ws as any);

    ws.on("close", () => {
      unsubscribeClient(websiteId, ws as any);
    });

    ws.on("error", () => {
      unsubscribeClient(websiteId, ws as any);
    });
  });
}
