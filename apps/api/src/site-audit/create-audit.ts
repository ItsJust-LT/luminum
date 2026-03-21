import type { PrismaClient } from "@luminum/database";
import { enqueueAudit } from "./queue.js";

export type AuditTriggerSource = "manual" | "bootstrap" | "scheduled";

function normalizeHost(host: string): string {
  return host.replace(/^www\./, "").toLowerCase();
}

export function buildAuditTargetUrl(domain: string, path?: string): { targetUrl: string; path: string } {
  const urlPath =
    path && typeof path === "string"
      ? path.startsWith("/")
        ? path
        : `/${path}`
      : "/";
  const targetUrl = `https://${domain}${urlPath}`;
  const parsed = new URL(targetUrl);
  if (normalizeHost(parsed.hostname) !== normalizeHost(domain)) {
    throw new Error("Target URL host does not match website domain");
  }
  return { targetUrl, path: urlPath };
}

/**
 * Creates a website_audit row and enqueues the Lighthouse job.
 */
export async function createAndEnqueueWebsiteAudit(
  prisma: PrismaClient,
  params: {
    websiteId: string;
    organizationId: string;
    domain: string;
    path?: string;
    formFactor: "mobile" | "desktop";
    triggerSource: AuditTriggerSource;
  },
) {
  const factor = params.formFactor === "desktop" ? "desktop" : "mobile";
  const { targetUrl, path: urlPath } = buildAuditTargetUrl(params.domain, params.path);

  const audit = await prisma.website_audit.create({
    data: {
      website_id: params.websiteId,
      organization_id: params.organizationId,
      target_url: targetUrl,
      path: urlPath,
      form_factor: factor,
      status: "queued",
      trigger_source: params.triggerSource,
    },
  });

  await enqueueAudit({
    auditId: audit.id,
    websiteId: params.websiteId,
    targetUrl,
    formFactor: factor,
  });

  return audit;
}
