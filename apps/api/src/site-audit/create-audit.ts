import type { PrismaClient } from "@luminum/database";
import { discoverPathsForDomain } from "./discover-urls.js";
import { enqueueAudit } from "./queue.js";

export type AuditTriggerSource = "manual" | "bootstrap" | "scheduled";

export async function createFullSiteScan(
  prisma: PrismaClient,
  params: {
    websiteId: string;
    organizationId: string;
    domain: string;
    triggerSource: AuditTriggerSource;
  },
): Promise<{ auditId: string; pagesDiscovered: number; paths: string[] }> {
  const paths = await discoverPathsForDomain(params.domain);
  const audit = await prisma.website_audit.create({
    data: {
      website_id: params.websiteId,
      organization_id: params.organizationId,
      target_url: `https://${params.domain}/`,
      path: null,
      form_factor: "both",
      status: "queued",
      trigger_source: params.triggerSource,
    },
  });

  const jobId = await enqueueAudit({
    auditId: audit.id,
    websiteId: params.websiteId,
    domain: params.domain,
    paths,
  });

  if (!jobId) {
    await prisma.website_audit.update({
      where: { id: audit.id },
      data: {
        status: "failed",
        completed_at: new Date(),
        error_message: "Audit queue unavailable (REDIS_URL or audit-worker).",
      },
    });
    throw new Error("Site audit queue is unavailable (check REDIS_URL and audit-worker).");
  }

  return { auditId: audit.id, pagesDiscovered: paths.length, paths };
}
