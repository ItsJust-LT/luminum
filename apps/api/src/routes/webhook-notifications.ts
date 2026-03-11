import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (body.websiteId && body.submissionData) {
      const { websiteId, submissionData, formName } = body;
      const website = await prisma.websites.findUnique({
        where: { id: websiteId },
        select: { organization_id: true, name: true },
      });
      if (!website) return res.status(404).json({ error: "Website not found" });

      const submission = await prisma.form_submissions.create({
        data: { website_id: websiteId, data: submissionData, seen: false, contacted: false },
      });

      const { notifyFormSubmission } = await import("../lib/notifications/helpers.js");
      await notifyFormSubmission(websiteId, formName || "Form Submission", submissionData, submission.id);

      return res.json({ success: true, submissionId: submission.id });
    }

    return res.status(400).json({ error: "Invalid payload" });
  } catch (error: any) {
    console.error("Notification webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as webhookNotificationsRouter };
