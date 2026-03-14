import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { setLiveCount, setLivePages } from "../lib/analytics-live.js";
import { broadcastToChannel } from "../lib/realtime-ws.js";
import { rateLimitWebhook } from "../middleware/rate-limit.js";
import { backupLiveCountToRedis } from "../lib/redis-live.js";

const router = Router();
router.use(rateLimitWebhook);

function verifyWebhookSecret(req: Request, res: Response): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && req.headers["x-webhook-secret"] !== webhookSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// POST /api/analytics/live-update
// Called by the Go analytics service when viewer count changes for a website.
// Now also accepts per-page visitor counts.
router.post("/live-update", async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req, res)) return;

    const { websiteId, live, pages } = req.body;
    if (!websiteId || typeof live !== "number") {
      return res.status(400).json({ error: "Missing websiteId or live (number)" });
    }

    setLiveCount(websiteId, live);
    backupLiveCountToRedis(websiteId, live);

    if (pages && typeof pages === "object") {
      setLivePages(websiteId, pages);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[analytics/live-update] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/page-transition
// Called by the Go analytics service when a visitor navigates between pages.
// Body: { websiteId, sessionId, fromPage, toPage }
// Can also accept batch: { websiteId, transitions: [{ sessionId, fromPage, toPage }] }
router.post("/page-transition", async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req, res)) return;

    const { websiteId, transitions, sessionId, fromPage, toPage } = req.body;
    if (!websiteId) {
      return res.status(400).json({ error: "Missing websiteId" });
    }

    const website = await prisma.websites.findFirst({
      where: { OR: [{ id: websiteId }, { website_id: websiteId }] },
      select: { id: true },
    });
    if (!website) return res.status(404).json({ error: "Website not found" });

    const records: Array<{
      website_id: string;
      session_id: string;
      from_page: string;
      to_page: string;
    }> = [];

    if (Array.isArray(transitions)) {
      for (const t of transitions) {
        if (t.sessionId && t.fromPage && t.toPage) {
          records.push({
            website_id: website.id,
            session_id: String(t.sessionId),
            from_page: String(t.fromPage),
            to_page: String(t.toPage),
          });
        }
      }
    } else if (sessionId && fromPage && toPage) {
      records.push({
        website_id: website.id,
        session_id: String(sessionId),
        from_page: String(fromPage),
        to_page: String(toPage),
      });
    }

    if (records.length > 0) {
      await prisma.page_transitions.createMany({ data: records });
    }

    res.json({ success: true, inserted: records.length });
  } catch (error: any) {
    console.error("[analytics/page-transition] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/event-notify
// Called by the Go analytics service after a new event (page view) is inserted.
// Broadcasts to the analytics WebSocket channel so the dashboard updates in real-time.
router.post("/event-notify", async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req, res)) return;

    const { websiteId, eventId, url, sessionId } = req.body;
    if (!websiteId) return res.status(400).json({ error: "Missing websiteId" });

    const website = await prisma.websites.findFirst({
      where: { OR: [{ id: websiteId }, { website_id: websiteId }] },
      select: { id: true, website_id: true },
    });

    if (website) {
      const data = { websiteId: website.id, eventId, url, sessionId, timestamp: new Date().toISOString() };
      broadcastToChannel(`analytics:${website.id}`, { type: "analytics:event", data });
      if (website.website_id && website.website_id !== website.id) {
        broadcastToChannel(`analytics:${website.website_id}`, { type: "analytics:event", data });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[analytics/event-notify] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/form-notify
// Called by the Go analytics service after a form submission is inserted
router.post("/form-notify", async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req, res)) return;

    const { websiteId, submissionId, formName, formData } = req.body;
    if (!websiteId) return res.status(400).json({ error: "Missing websiteId" });

    const website = await prisma.websites.findFirst({
      where: { OR: [{ id: websiteId }, { website_id: websiteId }] },
      select: { id: true, organization_id: true, name: true },
    });
    if (!website) return res.status(404).json({ error: "Website not found" });

    try {
      const { notifyFormSubmission } = await import("../lib/notifications/helpers.js");
      await notifyFormSubmission(
        website.id,
        formName || "Form Submission",
        formData || {},
        submissionId
      );
    } catch (e) {
      console.error("[analytics/form-notify] Notification failed:", e);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[analytics/form-notify] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as analyticsWebhookRouter };
