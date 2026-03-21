import { prisma } from "./prisma.js";
import { createAndEnqueueWebsiteAudit } from "../site-audit/create-audit.js";
import { logger } from "./logger.js";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Enqueues one mobile homepage audit per website per UTC day (trigger_source=scheduled),
 * skipping sites that already received a scheduled run today.
 */
export async function runScheduledSiteAudits(): Promise<{
  totalWebsites: number;
  enqueued: number;
  skippedAlreadyToday: number;
  errors: string[];
}> {
  const dayStart = startOfUtcDay();
  const errors: string[] = [];

  const websites = await prisma.websites.findMany({
    select: { id: true, domain: true, organization_id: true },
  });

  const scheduledToday = await prisma.website_audit.findMany({
    where: {
      trigger_source: "scheduled",
      path: "/",
      form_factor: "mobile",
      created_at: { gte: dayStart },
    },
    select: { website_id: true },
  });
  const already = new Set(scheduledToday.map((a) => a.website_id));

  let enqueued = 0;
  let skippedAlreadyToday = 0;
  for (const w of websites) {
    if (already.has(w.id)) {
      skippedAlreadyToday++;
      continue;
    }
    try {
      await createAndEnqueueWebsiteAudit(prisma, {
        websiteId: w.id,
        organizationId: w.organization_id,
        domain: w.domain,
        path: "/",
        formFactor: "mobile",
        triggerSource: "scheduled",
      });
      enqueued++;
      already.add(w.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${w.domain}: ${msg}`);
      logger.warn("Scheduled site audit enqueue failed", { websiteId: w.id, domain: w.domain, error: msg });
    }
  }

  return {
    totalWebsites: websites.length,
    enqueued,
    skippedAlreadyToday,
    errors,
  };
}
