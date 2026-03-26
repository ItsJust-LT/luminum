import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { cacheGet, cacheSet, cacheDel } from "../lib/redis-cache.js";

const router = Router();

const DOMAIN_LOOKUP_SECRET = process.env.DOMAIN_LOOKUP_SECRET || "";
const CACHE_TTL_SEC = 300;

interface DomainLookupResult {
  organizationId: string;
  slug: string;
  name: string;
  logo: string | null;
}

async function lookupDomain(domain: string): Promise<DomainLookupResult | null> {
  const cacheKey = `domain-lookup:${domain}`;
  const cached = await cacheGet<DomainLookupResult>(cacheKey);
  if (cached) return cached;

  const org = await prisma.organization.findFirst({
    where: {
      custom_domain: domain,
      branded_dashboard_enabled: true,
      custom_domain_verified: true,
    },
    select: { id: true, slug: true, name: true, logo: true },
  });

  if (!org) return null;

  const result: DomainLookupResult = {
    organizationId: org.id,
    slug: org.slug,
    name: org.name,
    logo: org.logo,
  };
  await cacheSet(cacheKey, result, CACHE_TTL_SEC);
  return result;
}

// GET /api/domain-lookup?domain=admin.acme.com
// Protected by shared secret header -- called from Next.js middleware (server-side)
router.get("/", async (req: Request, res: Response) => {
  try {
    if (DOMAIN_LOOKUP_SECRET && req.headers["x-domain-lookup-secret"] !== DOMAIN_LOOKUP_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const domain = (req.query.domain as string || "").toLowerCase().trim();
    if (!domain) return res.status(400).json({ error: "domain query parameter required" });

    const result = await lookupDomain(domain);
    if (!result) return res.status(404).json({ error: "Domain not found" });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/domain-lookup/verify?domain=admin.acme.com
// Caddy on-demand TLS `ask` endpoint -- returns 200 for verified domains, 404 otherwise
router.get("/verify", async (req: Request, res: Response) => {
  try {
    const domain = (req.query.domain as string || "").toLowerCase().trim();
    if (!domain) return res.status(404).end();

    const result = await lookupDomain(domain);
    if (result) return res.status(200).end();

    res.status(404).end();
  } catch {
    res.status(404).end();
  }
});

export { router as domainLookupRouter };
