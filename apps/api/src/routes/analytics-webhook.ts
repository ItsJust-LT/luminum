import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { setLiveCount } from "../lib/analytics-live.js";
import { rateLimitWebhook } from "../middleware/rate-limit.js";
import { backupLiveCountToRedis } from "../lib/redis-live.js";

const router = Router();
router.use(rateLimitWebhook);

// POST /api/analytics/live-update
// Called by the Go analytics service when viewer count changes for a website.
// Secured by X-Webhook-Secret (same as form-notify).
router.post("/live-update", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret && req.headers["x-webhook-secret"] !== webhookSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { websiteId, live } = req.body;
    if (!websiteId || typeof live !== "number") {
      return res.status(400).json({ error: "Missing websiteId or live (number)" });
    }

    setLiveCount(websiteId, live);
    backupLiveCountToRedis(websiteId, live);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[analytics/live-update] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/form-notify
// Called by the Go analytics service after a form submission is inserted
router.post("/form-notify", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret && req.headers["x-webhook-secret"] !== webhookSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
