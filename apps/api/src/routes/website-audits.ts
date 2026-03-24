import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization } from "../lib/access.js";
import { getQueryParam, getPathParam } from "../lib/req-params.js";
import { rateLimitAudit, rateLimitAuditBootstrap } from "../middleware/rate-limit.js";
import { createFullSiteScan } from "../site-audit/create-audit.js";

const router = Router();
router.use(requireAuth);

router.post("/bootstrap", rateLimitAuditBootstrap, async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.body ?? {};
    if (!websiteId) return res.status(400).json({ data: null, error: "websiteId is required" });

    const website = await prisma.websites.findUnique({
      where: { id: websiteId },
      select: { id: true, domain: true, organization_id: true },
    });
    if (!website) return res.status(404).json({ data: null, error: "Website not found" });
    if (!(await canAccessOrganization(website.organization_id, req.user))) {
      return res.status(403).json({ data: null, error: "Access denied" });
    }

    const pending = await prisma.website_audit.findFirst({
      where: { website_id: websiteId, status: { in: ["queued", "running"] } },
      select: { id: true },
    });
    if (pending) {
      return res.json({ data: { triggered: false as const, reason: "pending" as const, auditId: pending.id }, error: null });
    }

    const run = await createFullSiteScan(prisma, {
      websiteId,
      organizationId: website.organization_id,
      domain: website.domain,
      triggerSource: "bootstrap",
    });

    return res.json({
      data: {
        triggered: true as const,
        reason: "enqueued" as const,
        auditId: run.auditId,
        pagesDiscovered: run.pagesDiscovered,
      },
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

router.post("/", rateLimitAudit, async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.body ?? {};
    if (!websiteId) return res.status(400).json({ data: null, error: "websiteId is required" });

    const website = await prisma.websites.findUnique({
      where: { id: websiteId },
      select: { id: true, domain: true, organization_id: true },
    });
    if (!website) return res.status(404).json({ data: null, error: "Website not found" });
    if (!(await canAccessOrganization(website.organization_id, req.user))) {
      return res.status(403).json({ data: null, error: "Access denied" });
    }

    const run = await createFullSiteScan(prisma, {
      websiteId,
      organizationId: website.organization_id,
      domain: website.domain,
      triggerSource: "manual",
    });

    return res.json({
      data: { auditId: run.auditId, pagesDiscovered: run.pagesDiscovered, paths: run.paths },
      error: null,
    });
  } catch (err: any) {
    return res.status(400).json({ data: null, error: err?.message ?? "Failed to create audit" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const websiteId = getQueryParam(req, "websiteId");
    const organizationId = getQueryParam(req, "organizationId");
    const page = Math.max(1, parseInt(getQueryParam(req, "page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(getQueryParam(req, "limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    if (!websiteId && !organizationId) {
      return res.status(400).json({ data: [], error: "websiteId or organizationId is required" });
    }

    if (organizationId && !(await canAccessOrganization(organizationId, req.user))) {
      return res.status(403).json({ data: [], error: "Access denied" });
    }
    if (websiteId) {
      const website = await prisma.websites.findUnique({
        where: { id: websiteId },
        select: { organization_id: true },
      });
      if (!website) return res.status(404).json({ data: [], error: "Website not found" });
      if (!(await canAccessOrganization(website.organization_id, req.user))) {
        return res.status(403).json({ data: [], error: "Access denied" });
      }
    }

    const where: Record<string, unknown> = {};
    if (websiteId) where.website_id = websiteId;
    if (organizationId) where.organization_id = organizationId;

    const [audits, total] = await Promise.all([
      prisma.website_audit.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: { result: { select: { summary: true } } },
      }),
      prisma.website_audit.count({ where }),
    ]);

    return res.json({
      data: audits.map((a) => ({
        id: a.id,
        websiteId: a.website_id,
        organizationId: a.organization_id,
        status: a.status,
        targetUrl: a.target_url,
        path: null,
        formFactor: "both",
        triggerSource: a.trigger_source,
        errorMessage: a.error_message,
        lighthouseVersion: a.lighthouse_version,
        startedAt: a.started_at?.toISOString() ?? null,
        completedAt: a.completed_at?.toISOString() ?? null,
        createdAt: a.created_at.toISOString(),
        summary: a.result?.summary ?? null,
      })),
      total,
      page,
      limit,
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ data: [], error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, "id")!;
    const audit = await prisma.website_audit.findUnique({
      where: { id },
      include: { result: true },
    });
    if (!audit) return res.status(404).json({ data: null, error: "Audit not found" });
    if (!(await canAccessOrganization(audit.organization_id, req.user))) {
      return res.status(403).json({ data: null, error: "Access denied" });
    }

    return res.json({
      data: {
        id: audit.id,
        websiteId: audit.website_id,
        organizationId: audit.organization_id,
        status: audit.status,
        targetUrl: audit.target_url,
        path: null,
        formFactor: "both",
        triggerSource: audit.trigger_source,
        errorMessage: audit.error_message,
        lighthouseVersion: audit.lighthouse_version,
        startedAt: audit.started_at?.toISOString() ?? null,
        completedAt: audit.completed_at?.toISOString() ?? null,
        createdAt: audit.created_at.toISOString(),
        summary: audit.result?.summary ?? null,
        metrics: audit.result?.metrics ?? null,
      },
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

router.post("/:id/retry", rateLimitAudit, async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, "id")!;
    const existing = await prisma.website_audit.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ data: null, error: "Audit not found" });
    if (!(await canAccessOrganization(existing.organization_id, req.user))) {
      return res.status(403).json({ data: null, error: "Access denied" });
    }

    const website = await prisma.websites.findUnique({
      where: { id: existing.website_id },
      select: { domain: true },
    });
    if (!website) return res.status(404).json({ data: null, error: "Website not found" });

    const run = await createFullSiteScan(prisma, {
      websiteId: existing.website_id,
      organizationId: existing.organization_id,
      domain: website.domain,
      triggerSource: "manual",
    });

    return res.json({ data: { auditId: run.auditId, pagesDiscovered: run.pagesDiscovered }, error: null });
  } catch (err: any) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

export { router as websiteAuditsRouter };
