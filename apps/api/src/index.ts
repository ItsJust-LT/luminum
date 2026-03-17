import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { requestLogMiddleware } from "./middleware/request-log.js";
import { auth } from "./auth/config.js";
import { attachRealtimeWS, broadcastToAdmins, broadcastToOrg } from "./lib/realtime-ws.js";
import { prisma } from "./lib/prisma.js";
import { setLogBroadcaster } from "./lib/log-broadcast.js";
import { collectServerMetrics } from "./lib/server-metrics.js";
import { emailsRouter } from "./routes/emails.js";
import { formsRouter } from "./routes/forms.js";
import { organizationSettingsRouter } from "./routes/organization-settings.js";
import { organizationActionsRouter } from "./routes/organization-actions.js";
import { organizationManagementRouter } from "./routes/organization-management.js";
import { adminRouter } from "./routes/admin.js";
import { paystackRouter } from "./routes/paystack.js";
import { supportRouter } from "./routes/support.js";
import { notificationsRouter } from "./routes/notifications.js";
import { notificationPreferencesRouter } from "./routes/notification-preferences.js";
import { webhookEmailsRouter } from "./routes/webhook-emails.js";
import { webhookNotificationsRouter } from "./routes/webhook-notifications.js";
import { imagesRouter } from "./routes/images.js";
import { uploadsRouter } from "./routes/uploads.js";
import { filesRouter } from "./routes/files.js";
import { avatarRouter } from "./routes/avatar.js";
import { websitesRouter } from "./routes/websites.js";
import { membersRouter } from "./routes/members.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { userManagementRouter } from "./routes/user-management.js";
import { analyticsRouter } from "./routes/analytics.js";
import { analyticsWebhookRouter } from "./routes/analytics-webhook.js";
import { adminAnalyticsRouter } from "./routes/admin-analytics.js";
import { adminFormsRouter } from "./routes/admin-forms.js";
import { adminEmailsRouter } from "./routes/admin-emails.js";
import { adminWebsitesRouter } from "./routes/admin-websites.js";
import { adminActivityRouter } from "./routes/admin-activity.js";
import { adminMonitoringRouter } from "./routes/admin-monitoring.js";
import { adminLogsRouter } from "./routes/admin-logs.js";
import { adminDatabaseRouter } from "./routes/admin-database.js";
import { adminWhatsappRouter } from "./routes/admin-whatsapp.js";
import { cronRouter } from "./routes/cron.js";
import { whatsappRouter } from "./routes/whatsapp.js";
import { initWhatsAppManager } from "./whatsapp/manager.js";

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────
const corsOrigins = Array.isArray(config.corsOrigin) ? config.corsOrigin : [config.corsOrigin];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin or non-browser
      if (corsOrigins.some((allowed) => allowed === origin)) return cb(null, true);
      cb(null, false); // disallow, no CORS header sent
    },
    credentials: true,
  })
);

// ─── Authentication (must run before body parsers) ─────────────────────────
app.all("/api/auth/*", toNodeHandler(auth));

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// ─── Request logging (after body, before routes) ───────────────────────────
app.use(requestLogMiddleware);

// ─── Health & session ─────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
    ...(config.nodeEnv !== "production" && { env: config.nodeEnv }),
  });
});

app.get("/api/me", async (req, res) => {
  try {
    const { fromNodeHeaders } = await import("better-auth/node");
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      return res.status(401).json({ error: "Authentication required" });
    }
    res.json(session);
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
});

// ─── Cron (secret auth) ─────────────────────────────────────────────────────
app.use("/api/cron", cronRouter);

// ─── Webhooks & public endpoints (no auth) ──────────────────────────────────
app.use("/api/webhook/emails", webhookEmailsRouter);
app.use("/api/notifications", webhookNotificationsRouter);
app.use("/api/images", imagesRouter);
app.use("/api/analytics", analyticsWebhookRouter);

// ─── Protected API routes ─────────────────────────────────────────────────
app.use("/api/emails", emailsRouter);
app.use("/api/forms", formsRouter);
app.use("/api/organization-settings", organizationSettingsRouter);
app.use("/api/organization-actions", organizationActionsRouter);
app.use("/api/organization-management", organizationManagementRouter);
app.use("/api/admin/analytics", adminAnalyticsRouter);
app.use("/api/admin/forms", adminFormsRouter);
app.use("/api/admin/emails", adminEmailsRouter);
app.use("/api/admin/websites", adminWebsitesRouter);
app.use("/api/admin/activity", adminActivityRouter);
app.use("/api/admin/monitoring", adminMonitoringRouter);
app.use("/api/admin/logs", adminLogsRouter);
app.use("/api/admin/database", adminDatabaseRouter);
app.use("/api/admin/whatsapp", adminWhatsappRouter);
app.use("/api/admin", adminRouter);
app.use("/api/paystack", paystackRouter);
app.use("/api/support", supportRouter);
app.use("/api/user-notifications", notificationsRouter);
app.use("/api/notification-preferences", notificationPreferencesRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/files", filesRouter);
app.use("/api/avatar", avatarRouter);
app.use("/api/websites", websitesRouter);
app.use("/api/members", membersRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/user-management", userManagementRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/whatsapp", whatsappRouter);

// ─── Global error handler (must be last) ───────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: () => void) => {
  const req = _req as express.Request & { requestId?: string; method?: string; path?: string };
  logger.logError(err, "Unhandled request error", {
    path: req?.path ?? req?.url,
    method: req?.method,
  }, req?.requestId);
  res.status(500).json({ error: "Internal server error" });
});

// ─── HTTP server & WebSocket ──────────────────────────────────────────────
const httpServer = createServer(app);
attachRealtimeWS(httpServer);
setLogBroadcaster((log) => broadcastToAdmins({ type: "log:new", data: log }));

// Broadcast server metrics to admins every 5s for realtime monitoring
const MONITORING_INTERVAL_MS = 5000;
setInterval(() => {
  collectServerMetrics()
    .then((snapshot) => {
      broadcastToAdmins({ type: "monitoring:metrics", data: snapshot });
    })
    .catch((err) => {
      try {
        logger.warn("Monitoring broadcast failed", { error: String(err) });
      } catch {}
    });
}, MONITORING_INTERVAL_MS);

httpServer.listen(config.port, () => {
  logger.info("API server started", {
    port: config.port,
    env: config.nodeEnv,
    appUrl: config.appUrl,
  });

  // Initialize WhatsApp manager after server is listening
  initWhatsAppManager({ prisma, broadcastToOrg, broadcastToAdmins }).catch((err) => {
    logger.logError(err, "Failed to initialize WhatsApp Manager");
  });
});
