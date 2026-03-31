import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { requireOrgPermissions } from "../lib/org-permission-http.js";
import { pathParam, queryParam } from "../lib/req-params.js";

const router = Router();
router.use(requireAuth);

function formatWebsite(w: any) {
  return {
    ...w,
    name: w.name ?? undefined,
    created_at: w.created_at?.toISOString() || new Date().toISOString(),
    updated_at: w.updated_at?.toISOString() || new Date().toISOString(),
    website_id: w.website_id ?? undefined,
    analytics: w.analytics ?? false,
    script_last_verified_at: w.script_last_verified_at?.toISOString?.() ?? undefined,
    script_last_error: w.script_last_error ?? undefined,
    metadata: w.metadata && typeof w.metadata === "object" ? w.metadata : {},
    settings: w.settings && typeof w.settings === "object" ? w.settings : {},
  };
}

// POST /api/websites
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, domain, organization_id, analytics } = req.body;
    if (!organization_id || !domain.includes(".")) return res.status(400).json({ data: null, error: "organization_id and domain required" });
    if (!(await requireOrgPermissions(organization_id, req.user, res, ["org:websites:write"]))) return;
    const website = await prisma.websites.create({ data: { name, domain, organization_id, analytics: analytics || false } });
    res.json({ data: formatWebsite(website), error: null });
  } catch (error: any) { res.json({ data: null, error: error.message }); }
});

// GET /api/websites?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = queryParam(req, "organizationId");
    if (organizationId) {
      if (!(await requireOrgPermissions(organizationId, req.user, res, ["org:websites:read"]))) return;
      const websites = await prisma.websites.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: "desc" } });
      return res.json({ data: websites.map(formatWebsite), error: null });
    }
    const websites = await prisma.websites.findMany({ orderBy: { created_at: "desc" } });
    res.json({ data: websites.map(formatWebsite), error: null });
  } catch (error: any) { res.json({ data: [], error: error.message }); }
});

// PATCH /api/websites/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id")!;
    const existing = await prisma.websites.findUnique({ where: { id }, select: { organization_id: true } });
    if (!existing || !(await requireOrgPermissions(existing.organization_id, req.user, res, ["org:websites:write"])))
      return;
    const data = req.body;
    if (data.domain && !data.domain.includes(".")) return res.status(400).json({ data: null, error: "Domain must include TLD" });
    const website = await prisma.websites.update({ where: { id }, data: { ...data, updated_at: new Date() } });
    res.json({ data: formatWebsite(website), error: null });
  } catch (error: any) { res.json({ data: null, error: error.message }); }
});

// DELETE /api/websites/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id")!;
    const existing = await prisma.websites.findUnique({ where: { id }, select: { organization_id: true } });
    if (!existing || !(await requireOrgPermissions(existing.organization_id, req.user, res, ["org:websites:delete"])))
      return;
    await prisma.websites.delete({ where: { id } });
    res.json({ success: true, error: null });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/websites/by-domain?domain=...
router.get("/by-domain", async (req: Request, res: Response) => {
  try {
    const website = await prisma.websites.findUnique({ where: { domain: queryParam(req, "domain")! } });
    res.json({ data: website ? formatWebsite(website) : null, error: null });
  } catch (error: any) { res.json({ data: null, error: error.message }); }
});

// GET /api/websites/check-domain?domain=...
router.get("/check-domain", async (req: Request, res: Response) => {
  try {
    const website = await prisma.websites.findUnique({ where: { domain: queryParam(req, "domain")! }, select: { id: true } });
    res.json({ available: !website, error: null });
  } catch (error: any) { res.json({ available: false, error: error.message }); }
});

// POST /api/websites/:id/toggle-analytics
router.post("/:id/toggle-analytics", async (req: Request, res: Response) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ data: null, error: "Admin only" });
    const { enabled } = req.body;
    const website = await prisma.websites.update({ where: { id: pathParam(req, "id")! }, data: { analytics: enabled, updated_at: new Date() } });
    res.json({ data: formatWebsite(website), error: null });
  } catch (error: any) { res.json({ data: null, error: error.message }); }
});

export { router as websitesRouter };
