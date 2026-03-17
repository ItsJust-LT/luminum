import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { getMemberOrAdmin } from "../lib/access.js";
import * as s3 from "../lib/storage/s3.js";
import { orgImagesKey } from "../lib/storage/keys.js";
import { updateOrganizationStorage } from "../lib/utils/storage.js";

const router = Router();
router.use(requireAuth);

// GET /api/organization-settings/emails-enabled?organizationId=...
router.get("/emails-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.query.organizationId as string }, select: { emails_enabled: true } });
    res.json({ enabled: org?.emails_enabled || false });
  } catch { res.json({ enabled: false }); }
});

// GET /api/organization-settings/whatsapp-enabled?organizationId=...
router.get("/whatsapp-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.query.organizationId as string }, select: { whatsapp_enabled: true } });
    res.json({ enabled: org?.whatsapp_enabled || false });
  } catch { res.json({ enabled: false }); }
});

// GET /api/organization-settings/analytics-enabled?organizationId=...
router.get("/analytics-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.query.organizationId as string }, select: { analytics_enabled: true } });
    res.json({ enabled: org?.analytics_enabled || false });
  } catch { res.json({ enabled: false }); }
});

// GET /api/organization-settings/storage?organizationId=... — storage usage and breakdown by category
router.get("/storage", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });

    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { used_storage_bytes: true, max_storage_bytes: true },
    });
    if (!organization) return res.status(404).json({ success: false, error: "Organization not found" });

    const usedStorage = Number(organization.used_storage_bytes ?? 0);
    const maxStorage = Number(organization.max_storage_bytes ?? 10737418240);
    const storageUsagePercent = maxStorage > 0 ? Math.min(100, (usedStorage / maxStorage) * 100) : 0;

    let breakdown: Awaited<ReturnType<typeof s3.getOrganizationStorageBreakdown>> | null = null;
    if (s3.isStorageConfigured()) {
      try {
        breakdown = await s3.getOrganizationStorageBreakdown(organizationId);
      } catch {}
    }

    res.json({
      success: true,
      data: {
        used_storage_bytes: usedStorage,
        max_storage_bytes: maxStorage,
        storage_usage_percent: storageUsagePercent,
        storage_warning: storageUsagePercent > 80,
        breakdown: breakdown
          ? {
              total: breakdown.total,
              byCategory: {
                images: breakdown.byCategory.images,
                attachments: breakdown.byCategory.attachments,
              },
            }
          : null,
      },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/organization-settings?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) return res.status(404).json({ success: false, error: "Organization not found" });

    const member = await getMemberOrAdmin(organizationId, req.user);
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
        analytics: organization.analytics_enabled || false,
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
    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    const updates = req.body;
    if (updates.slug) {
      const existing = await prisma.organization.findFirst({ where: { slug: updates.slug, id: { not: organizationId } }, select: { id: true } });
      if (existing) return res.status(400).json({ success: false, error: "Slug already exists" });
    }

    const {
      country,
      currency,
      payment_provider,
      emails_enabled,
      email_domain_id,
      email_dns_verified_at,
      email_dns_last_check_at,
      email_dns_last_error,
      email_from_address,
      ...allowedUpdates
    } = updates;
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
    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    if (!organization) return res.status(404).json({ success: false, error: "Organization not found" });

    const { logoBase64, fileName, contentType } = req.body;
    if (!logoBase64) return res.status(400).json({ success: false, error: "No logo data" });

    const buffer = Buffer.from(logoBase64, "base64");
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ success: false, error: "File too large" });

    if (!s3.isStorageConfigured()) {
      return res.status(503).json({ success: false, error: "Storage not configured" });
    }

    const ext = (fileName || "logo.png").split(".").pop() || "png";
    const key = orgImagesKey(organizationId, ext);
    const { url, bytes } = await s3.upload(buffer, key, { contentType: contentType || "image/png" });

    try {
      await prisma.images.create({ data: { name: `${organization.name} Logo`, url, organization_id: organizationId, size_bytes: BigInt(bytes) } });
      await updateOrganizationStorage(organizationId, bytes);
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
    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { logo: true } });
    if (organization?.logo) {
      const imageRecord = await prisma.images.findFirst({ where: { organization_id: organizationId, url: organization.logo } });
      if (imageRecord) {
        try {
          const prefix = "/api/files/";
          const i = imageRecord.url.indexOf(prefix);
          if (i !== -1) {
            const key = decodeURIComponent(imageRecord.url.slice(i + prefix.length));
            const isOrgKey = key.startsWith(`org/${organizationId}/`);
            const isLegacyLogo = key.startsWith("logos/");
            if (isOrgKey || isLegacyLogo) {
              await s3.remove(key);
              if (imageRecord.size_bytes) {
                await updateOrganizationStorage(organizationId, -Number(imageRecord.size_bytes));
              }
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
