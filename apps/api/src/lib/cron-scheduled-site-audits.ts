import { prisma } from "./prisma.js";
import { createFullSiteScan } from "../site-audit/create-audit.js";
import { recoverStaleSiteAudits } from "../site-audit/recover-stale.js";
import { logger } from "./logger.js";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Enqueues one mobile homepage audit per website per UTC day (trigger_source=scheduled),
 * skipping sites that already have an in-flight or completed scheduled run today.
 * Failed scheduled runs today do not block a new attempt (e.g. after fixing the worker).
 */
export async function runScheduledSiteAudits(): Promise<{
  totalWebsites: number;
  enqueued: number;
  skippedAlreadyToday: number;
  errors: string[];
  recovered: Awaited<ReturnType<typeof recoverStaleSiteAudits>>;
}> {
  const dayStart = startOfUtcDay();
  const errors: string[] = [];

  const recovered = await recoverStaleSiteAudits(prisma);

  const websites = await prisma.websites.findMany({
    select: { id: true, domain: true, organization_id: true },
  });

  const scheduledToday = await prisma.website_audit.findMany({
    where: {
      trigger_source: "scheduled",
      created_at: { gte: dayStart },
      status: { in: ["queued", "running", "completed"] },
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
      await createFullSiteScan(prisma, {
        websiteId: w.id,
        organizationId: w.organization_id,
        domain: w.domain,
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
    recovered,
  };
}
