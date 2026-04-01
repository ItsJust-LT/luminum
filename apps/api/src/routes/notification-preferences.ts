import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);

// GET /api/notification-preferences
router.get("/", async (req: Request, res: Response) => {
  try {
    let prefs = await prisma.notification_preferences.findUnique({ where: { user_id: req.user.id } });
    if (!prefs) {
      prefs = await prisma.notification_preferences.create({ data: { user_id: req.user.id, push_enabled: true, in_app_enabled: true, email_enabled: true, disabled_types: [] } });
    }
    res.json({
      success: true,
      preferences: { id: prefs.id, userId: prefs.user_id, pushEnabled: prefs.push_enabled, inAppEnabled: prefs.in_app_enabled, emailEnabled: prefs.email_enabled, disabledTypes: (prefs.disabled_types as string[]) || [], createdAt: prefs.created_at, updatedAt: prefs.updated_at },
    });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// PATCH /api/notification-preferences
router.patch("/", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const prefs = await prisma.notification_preferences.upsert({
      where: { user_id: req.user.id },
      create: { user_id: req.user.id, push_enabled: data.push_enabled ?? true, in_app_enabled: data.in_app_enabled ?? true, email_enabled: data.email_enabled ?? true, disabled_types: data.disabled_types || [] },
      update: { ...(data.push_enabled !== undefined && { push_enabled: data.push_enabled }), ...(data.in_app_enabled !== undefined && { in_app_enabled: data.in_app_enabled }), ...(data.email_enabled !== undefined && { email_enabled: data.email_enabled }), ...(data.disabled_types !== undefined && { disabled_types: data.disabled_types }) },
    });
    res.json({
      success: true,
      preferences: { id: prefs.id, userId: prefs.user_id, pushEnabled: prefs.push_enabled, inAppEnabled: prefs.in_app_enabled, emailEnabled: prefs.email_enabled, disabledTypes: (prefs.disabled_types as string[]) || [], createdAt: prefs.created_at, updatedAt: prefs.updated_at },
    });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as notificationPreferencesRouter };
