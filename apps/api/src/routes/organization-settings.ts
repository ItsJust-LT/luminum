import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { getMemberOrAdmin } from "../lib/access.js";
import * as s3 from "../lib/storage/s3.js";
import { orgImagesKey } from "../lib/storage/keys.js";
import { updateOrganizationStorage } from "../lib/utils/storage.js";
import { isEmailSystemEnabled } from "../lib/email-system.js";
import { decryptEmailSecret, getEmailSecretsKeyIssue, isEmailSecretsKeyConfigured } from "../lib/email-secrets.js";
import { getOrgWithResendFields, maskResendApiKey } from "../lib/resend-org.js";
import { config } from "../config.js";
import { invalidateDomainLookupCacheForOrganization } from "../lib/invalidate-domain-lookup-cache.js";
import { sanitizeSignatureHtml } from "../lib/email-outbound-body.js";
import { isValidEmailLocalPart, normalizeEmailLocalPart } from "../lib/email-send.js";
import {
  parseForwardRulesJson,
  parseMailboxSignaturesJson,
} from "../lib/mail-organization-json.js";
import type { Prisma } from "@luminum/database";

const router = Router();
router.use(requireAuth);

// GET /api/organization-settings/emails-enabled?organizationId=...
router.get("/emails-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.query.organizationId as string }, select: { emails_enabled: true } });
    const sys = isEmailSystemEnabled();
    res.json({
      enabled: sys && (org?.emails_enabled || false),
      systemEmailAvailable: sys,
    });
  } catch {
    res.json({ enabled: false, systemEmailAvailable: false });
  }
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

// GET /api/organization-settings/blogs-enabled?organizationId=...
router.get("/blogs-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.query.organizationId as string },
      select: { blogs_enabled: true },
    });
    res.json({ enabled: org?.blogs_enabled || false });
  } catch {
    res.json({ enabled: false });
  }
});

// GET /api/organization-settings/invoices-enabled?organizationId=...
router.get("/invoices-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.query.organizationId as string },
      select: { invoices_enabled: true },
    });
    res.json({ enabled: org?.invoices_enabled || false });
  } catch {
    res.json({ enabled: false });
  }
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
                blog: breakdown.byCategory.blog,
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

// GET /api/organization-settings/email-composer?organizationId=...
router.get("/email-composer", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });

    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        emails_enabled: true,
        email_signature_html: true,
        email_signature_text: true,
        email_signature_enabled: true,
        email_default_from_local: true,
        email_mailbox_signatures: true,
        email_forward_rules: true,
        email_domain: { select: { domain: true } },
      },
    });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });

    const canEditOrganizationDefaults = member.role === "owner" || member.role === "admin";
    const memberRow = await prisma.member.findFirst({
      where: { organizationId, userId: req.user.id },
      select: { personalEmailSignatureHtml: true, personalEmailSignatureText: true },
    });

    res.json({
      success: true,
      data: {
        emailsEnabled: org.emails_enabled ?? false,
        canEditOrganizationDefaults,
        mailDomain: org.email_domain?.domain ?? "",
        organizationDefault: {
          signatureHtml: org.email_signature_html ?? "",
          signatureText: org.email_signature_text ?? "",
          signatureEnabled: org.email_signature_enabled ?? true,
          defaultFromLocal: org.email_default_from_local ?? "",
        },
        personal: {
          signatureHtml: memberRow?.personalEmailSignatureHtml ?? "",
          signatureText: memberRow?.personalEmailSignatureText ?? "",
        },
        mailboxSignatures: parseMailboxSignaturesJson(org.email_mailbox_signatures),
        forwardingRules: parseForwardRulesJson(org.email_forward_rules),
      },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// PATCH /api/organization-settings/email-composer?organizationId=...
router.patch("/email-composer", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });

    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { emails_enabled: true },
    });
    if (!org?.emails_enabled) {
      return res.status(400).json({ success: false, error: "Enable organization email before editing composer settings" });
    }

    const body = req.body as {
      organizationDefault?: {
        signatureHtml?: string;
        signatureText?: string;
        signatureEnabled?: boolean;
        defaultFromLocal?: string | null;
      };
      personal?: { signatureHtml?: string; signatureText?: string };
      mailboxSignatures?: unknown;
      forwardingRules?: unknown;
      signatureHtml?: string;
      signatureText?: string;
      signatureEnabled?: boolean;
      defaultFromLocal?: string | null;
    };

    const legacyOrg =
      body.signatureHtml !== undefined ||
      body.signatureText !== undefined ||
      body.signatureEnabled !== undefined ||
      body.defaultFromLocal !== undefined
        ? {
            signatureHtml: body.signatureHtml,
            signatureText: body.signatureText,
            signatureEnabled: body.signatureEnabled,
            defaultFromLocal: body.defaultFromLocal,
          }
        : undefined;

    const orgPatch = body.organizationDefault ?? legacyOrg;
    let updatedOrg = false;
    let updatedPersonal = false;
    let updatedMailbox = false;
    let updatedForward = false;

    if (orgPatch) {
      const hasOrgField =
        orgPatch.signatureHtml !== undefined ||
        orgPatch.signatureText !== undefined ||
        orgPatch.signatureEnabled !== undefined ||
        orgPatch.defaultFromLocal !== undefined;
      if (hasOrgField) {
        if (member.role !== "owner" && member.role !== "admin") {
          return res.status(403).json({
            success: false,
            error: "Only owners and admins can update organization default mail settings",
          });
        }
        const data: Record<string, unknown> = {};
        if (orgPatch.signatureHtml !== undefined) {
          const t = typeof orgPatch.signatureHtml === "string" ? orgPatch.signatureHtml.trim() : "";
          data.email_signature_html = t ? sanitizeSignatureHtml(t) : null;
        }
        if (orgPatch.signatureText !== undefined) {
          const t = typeof orgPatch.signatureText === "string" ? orgPatch.signatureText.trim().slice(0, 16_000) : "";
          data.email_signature_text = t || null;
        }
        if (typeof orgPatch.signatureEnabled === "boolean") {
          data.email_signature_enabled = orgPatch.signatureEnabled;
        }
        if (orgPatch.defaultFromLocal !== undefined) {
          if (orgPatch.defaultFromLocal === null || orgPatch.defaultFromLocal === "") {
            data.email_default_from_local = null;
          } else if (typeof orgPatch.defaultFromLocal === "string") {
            const n = normalizeEmailLocalPart(orgPatch.defaultFromLocal);
            if (!isValidEmailLocalPart(n)) {
              return res.status(400).json({ success: false, error: "Invalid default From local part" });
            }
            data.email_default_from_local = n;
          }
        }
        if (Object.keys(data).length === 0) {
          return res.status(400).json({ success: false, error: "No valid organization default fields to update" });
        }
        await prisma.organization.update({ where: { id: organizationId }, data: data as any });
        await invalidateDomainLookupCacheForOrganization(organizationId);
        updatedOrg = true;
      }
    }

    if (body.personal) {
      const row = await prisma.member.findFirst({
        where: { organizationId, userId: req.user.id },
        select: { id: true },
      });
      if (!row) {
        return res.status(403).json({ success: false, error: "Not an organization member" });
      }
      const mData: Record<string, unknown> = {};
      if (body.personal.signatureHtml !== undefined) {
        const t = typeof body.personal.signatureHtml === "string" ? body.personal.signatureHtml.trim() : "";
        mData.personalEmailSignatureHtml = t ? sanitizeSignatureHtml(t) : null;
      }
      if (body.personal.signatureText !== undefined) {
        const t =
          typeof body.personal.signatureText === "string" ? body.personal.signatureText.trim().slice(0, 16_000) : "";
        mData.personalEmailSignatureText = t || null;
      }
      if (Object.keys(mData).length === 0) {
        return res.status(400).json({ success: false, error: "No valid personal signature fields to update" });
      }
      await prisma.member.update({ where: { id: row.id }, data: mData as any });
      updatedPersonal = true;
    }

    if (body.mailboxSignatures !== undefined) {
      if (member.role !== "owner" && member.role !== "admin") {
        return res.status(403).json({ success: false, error: "Only owners and admins can edit mailbox signatures" });
      }
      const parsed = parseMailboxSignaturesJson(body.mailboxSignatures);
      const sanitized = parsed.map((r) => ({
        id: r.id,
        localPart: r.localPart,
        signatureHtml: r.signatureHtml?.trim() ? sanitizeSignatureHtml(String(r.signatureHtml)) : null,
        signatureText: r.signatureText?.trim() ? r.signatureText.trim().slice(0, 16_000) : null,
      }));
      await prisma.organization.update({
        where: { id: organizationId },
        data: { email_mailbox_signatures: sanitized as unknown as Prisma.InputJsonValue },
      });
      await invalidateDomainLookupCacheForOrganization(organizationId);
      updatedMailbox = true;
    }

    if (body.forwardingRules !== undefined) {
      if (member.role !== "owner" && member.role !== "admin") {
        return res.status(403).json({ success: false, error: "Only owners and admins can edit forwarding rules" });
      }
      const parsed = parseForwardRulesJson(body.forwardingRules);
      await prisma.organization.update({
        where: { id: organizationId },
        data: { email_forward_rules: parsed as unknown as Prisma.InputJsonValue },
      });
      await invalidateDomainLookupCacheForOrganization(organizationId);
      updatedForward = true;
    }

    if (!updatedOrg && !updatedPersonal && !updatedMailbox && !updatedForward) {
      return res.status(400).json({ success: false, error: "No valid fields to update" });
    }

    res.json({ success: true });
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
    await invalidateDomainLookupCacheForOrganization(organizationId);
    res.json({ success: true, message: "Settings updated" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/organization-settings/upload-logo?organizationId=...
router.post("/upload-logo", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const isPlatformAdmin = req.user?.role === "admin";
    const member = await getMemberOrAdmin(organizationId, req.user);
    if (
      !isPlatformAdmin &&
      (!member || (member.role !== "owner" && member.role !== "admin"))
    ) {
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
    await invalidateDomainLookupCacheForOrganization(organizationId);
    res.json({ success: true, data: { logoUrl: url } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// DELETE /api/organization-settings/logo?organizationId=...
router.delete("/logo", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const isPlatformAdmin = req.user?.role === "admin";
    const member = await getMemberOrAdmin(organizationId, req.user);
    if (
      !isPlatformAdmin &&
      (!member || (member.role !== "owner" && member.role !== "admin"))
    ) {
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
    await invalidateDomainLookupCacheForOrganization(organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/organization-settings/resend-email?organizationId=... — disabled for members (use GET /api/emails/setup-status); platform admins use GET /api/admin/organizations/:id/resend
router.get("/resend-email", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Resend credential details are only available to platform administrators.",
      });
    }
    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });
    const org = await getOrgWithResendFields(organizationId);
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });
    const domain = org.email_domain?.domain ?? null;
    let maskedKey: string | null = null;
    if (org.resend_api_key_ciphertext) {
      try {
        maskedKey = maskResendApiKey(decryptEmailSecret(org.resend_api_key_ciphertext));
      } catch {
        maskedKey = "•••• (decrypt error)";
      }
    }
    const hasWebhook = Boolean(org.resend_webhook_secret_ciphertext);
    const secretsReady = isEmailSecretsKeyConfigured();
    const secretsIssue = getEmailSecretsKeyIssue();
    res.json({
      success: true,
      secretsKeyConfigured: secretsReady,
      secretsKeyIssue: secretsReady ? undefined : secretsIssue,
      hasApiKey: Boolean(org.resend_api_key_ciphertext),
      hasWebhookSecret: hasWebhook,
      maskedApiKey: maskedKey,
      emailDomain: domain,
      emailDnsVerifiedAt: org.email_dns_verified_at?.toISOString() ?? null,
      lastValidatedAt: org.resend_last_validated_at?.toISOString() ?? null,
      lastError: org.resend_last_error ?? null,
      inboundWebhookUrl: `${config.apiUrl}/api/webhook/resend-inbound`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    res.json({ success: false, error: msg });
  }
});

// PUT /api/organization-settings/resend-email — disabled: platform admins configure Resend under Admin → Organization settings
router.put("/resend-email", async (_req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    error:
      "Resend API keys and webhook secrets are managed in the platform admin console (Admin → Organization settings → Mail / Resend).",
  });
});

// DELETE /api/organization-settings/resend-email — disabled (platform admin only)
router.delete("/resend-email", async (_req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    error:
      "Clearing Resend credentials is only available to platform administrators in the admin console.",
  });
});

// GET /api/organization-settings/branded-dashboard-enabled?organizationId=...
router.get("/branded-dashboard-enabled", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.query.organizationId as string },
      select: {
        branded_dashboard_enabled: true,
        custom_domain: true,
        custom_domain_prefix: true,
        custom_domain_verified: true,
      },
    });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });
    res.json({
      enabled: org.branded_dashboard_enabled,
      customDomain: org.custom_domain,
      customDomainPrefix: org.custom_domain_prefix,
      verified: org.custom_domain_verified,
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as organizationSettingsRouter };
