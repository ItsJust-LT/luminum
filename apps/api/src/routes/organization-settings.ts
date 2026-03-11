import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);

// GET /api/organization-settings/emails-enabled?organizationId=...
router.get("/emails-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.query.organizationId as string }, select: { emails_enabled: true } });
    res.json({ enabled: org?.emails_enabled || false });
  } catch { res.json({ enabled: false }); }
});

// GET /api/organization-settings?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) return res.status(404).json({ success: false, error: "Organization not found" });

    const member = await prisma.member.findFirst({ where: { organizationId, userId: req.user.id }, select: { role: true } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

    const canEdit = member.role === "owner" || member.role === "admin";
    const maxStorage = organization.max_storage_bytes || BigInt(10737418240);
    const usedStorage = organization.used_storage_bytes || BigInt(0);
    const storageUsagePercent = Number((usedStorage * BigInt(100)) / maxStorage);

    res.json({
      success: true,
      data: {
        ...organization,
        logo: organization.logo ?? undefined,
        billing_email: organization.billing_email ?? undefined,
        tax_id: organization.tax_id ?? undefined,
        max_subscriptions: organization.max_subscriptions ?? undefined,
        metadata: organization.metadata ? (typeof organization.metadata === "string" ? JSON.parse(organization.metadata) : organization.metadata) : undefined,
        billing_address: organization.billing_address && typeof organization.billing_address === "object" && !Array.isArray(organization.billing_address) ? organization.billing_address : undefined,
        max_storage_bytes: organization.max_storage_bytes ? Number(organization.max_storage_bytes) : undefined,
        used_storage_bytes: organization.used_storage_bytes ? Number(organization.used_storage_bytes) : undefined,
        storage_usage_percent: storageUsagePercent,
        storage_warning: storageUsagePercent > 80,
        analytics: false,
        emails: organization.emails_enabled || false,
        canEdit,
        userRole: member.role,
      },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// PATCH /api/organization-settings?organizationId=...
router.patch("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const member = await prisma.member.findFirst({ where: { organizationId, userId: req.user.id }, select: { role: true } });
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    const updates = req.body;
    if (updates.slug) {
      const existing = await prisma.organization.findFirst({ where: { slug: updates.slug, id: { not: organizationId } }, select: { id: true } });
      if (existing) return res.status(400).json({ success: false, error: "Slug already exists" });
    }

    const { country, currency, payment_provider, ...allowedUpdates } = updates;
    await prisma.organization.update({ where: { id: organizationId }, data: allowedUpdates });
    res.json({ success: true, message: "Settings updated" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-settings/upload-logo?organizationId=...
router.post("/upload-logo", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const member = await prisma.member.findFirst({ where: { organizationId, userId: req.user.id }, select: { role: true } });
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    if (!organization) return res.status(404).json({ success: false, error: "Organization not found" });

    const { logoBase64, fileName, contentType } = req.body;
    if (!logoBase64) return res.status(400).json({ success: false, error: "No logo data" });

    const buffer = Buffer.from(logoBase64, "base64");
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ success: false, error: "File too large" });

    const { uploadToR2 } = await import("../lib/utils/r2.js");
    const { updateOrganizationStorage } = await import("../lib/utils/storage.js");
    const sanitizedName = organization.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const ext = (fileName || "logo.png").split(".").pop() || "png";
    const key = `logos/${sanitizedName}-${Date.now()}.${ext}`;
    const url = await uploadToR2(buffer, key, "images", contentType || "image/png");

    try {
      await prisma.images.create({ data: { name: `${organization.name} Logo`, url, organization_id: organizationId, size_bytes: BigInt(buffer.length) } });
      await updateOrganizationStorage(organizationId, buffer.length);
    } catch {}

    await prisma.organization.update({ where: { id: organizationId }, data: { logo: url } });
    res.json({ success: true, data: { logoUrl: url } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// DELETE /api/organization-settings/logo?organizationId=...
router.delete("/logo", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const member = await prisma.member.findFirst({ where: { organizationId, userId: req.user.id }, select: { role: true } });
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { logo: true } });
    if (organization?.logo) {
      const imageRecord = await prisma.images.findFirst({ where: { organization_id: organizationId, url: organization.logo } });
      if (imageRecord) {
        try {
          const { deleteFromR2 } = await import("../lib/utils/r2.js");
          const urlParts = imageRecord.url.split("/images/");
          if (urlParts.length > 1) {
            await deleteFromR2(`logos/${urlParts[1]}`, "images");
            if (imageRecord.size_bytes) {
              const { updateOrganizationStorage } = await import("../lib/utils/storage.js");
              await updateOrganizationStorage(organizationId, -Number(imageRecord.size_bytes));
            }
          }
          await prisma.images.delete({ where: { id: imageRecord.id } });
        } catch {}
      }
    }

    await prisma.organization.update({ where: { id: organizationId }, data: { logo: null } });
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as organizationSettingsRouter };
