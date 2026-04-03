import { prisma } from "./prisma.js";

export interface AnalyticsScriptVerificationResult {
  checked: number;
  failed: number;
  errors: string[];
}

/**
 * Fetches a URL and returns the response body as string. Uses GET with a short timeout.
 */
async function fetchPageHtml(url: string): Promise<{ ok: boolean; body?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "Luminum-SetupCheck/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = await res.text();
    return { ok: true, body };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Check if the page HTML contains the analytics script for this website (websites.id in script URL).
 */
function pageContainsScript(body: string, siteId: string): boolean {
  const lower = body.toLowerCase();
  if (!lower.includes("script.js") && !lower.includes("script.min.js")) return false;
  const idLower = siteId.toLowerCase();
  if (body.includes(siteId) || lower.includes(idLower)) return true;
  if (body.includes(`websiteId=${siteId}`)) return true;
  if (lower.includes(`websiteid=${idLower}`)) return true;
  return false;
}

export async function runAnalyticsScriptVerification(): Promise<AnalyticsScriptVerificationResult> {
  const websites = await prisma.websites.findMany({
    where: {
      analytics: true,
      organization: { analytics_enabled: true },
    },
    select: {
      id: true,
      domain: true,
      organization_id: true,
      script_last_verified_at: true,
      script_last_error: true,
    },
  });

  const result: AnalyticsScriptVerificationResult = { checked: 0, failed: 0, errors: [] };
  const now = new Date();

  for (const site of websites) {
    result.checked++;
    const url = site.domain.startsWith("http") ? site.domain : `https://${site.domain}`;
    const { ok, body, error: fetchError } = await fetchPageHtml(url);
    if (!ok || !body) {
      await prisma.websites.update({
        where: { id: site.id },
        data: {
          script_last_verified_at: site.script_last_verified_at ?? undefined,
          script_last_error: fetchError || "Could not fetch page",
        },
      });
      result.failed++;
      result.errors.push(`Website ${site.domain} (${site.id}): ${fetchError || "fetch failed"}`);
      continue;
    }
    const found = pageContainsScript(body, site.id);
    if (found) {
      await prisma.websites.update({
        where: { id: site.id },
        data: { script_last_verified_at: now, script_last_error: null },
      });
    } else {
      await prisma.websites.update({
        where: { id: site.id },
        data: {
          script_last_verified_at: site.script_last_verified_at ?? undefined,
          script_last_error: "Tracking script (script.js?websiteId=...) not found on page",
        },
      });
      result.failed++;
      result.errors.push(`Website ${site.domain} (${site.id}): script not found`);
    }
  }

  return result;
}

/** Run script verification for a single organization's websites (for manual "Re-check" from dashboard). */
export async function runAnalyticsScriptVerificationForOrg(
  organizationId: string
): Promise<AnalyticsScriptVerificationResult> {
  const websites = await prisma.websites.findMany({
    where: {
      organization_id: organizationId,
      analytics: true,
    },
    select: {
      id: true,
      domain: true,
      organization_id: true,
      script_last_verified_at: true,
      script_last_error: true,
    },
  });

  const result: AnalyticsScriptVerificationResult = { checked: 0, failed: 0, errors: [] };
  const now = new Date();

  for (const site of websites) {
    result.checked++;
    const url = site.domain.startsWith("http") ? site.domain : `https://${site.domain}`;
    const { ok, body, error: fetchError } = await fetchPageHtml(url);
    if (!ok || !body) {
      await prisma.websites.update({
        where: { id: site.id },
        data: {
          script_last_verified_at: site.script_last_verified_at ?? undefined,
          script_last_error: fetchError || "Could not fetch page",
        },
      });
      result.failed++;
      result.errors.push(`Website ${site.domain} (${site.id}): ${fetchError || "fetch failed"}`);
      continue;
    }
    const found = pageContainsScript(body, site.id);
    if (found) {
      await prisma.websites.update({
        where: { id: site.id },
        data: { script_last_verified_at: now, script_last_error: null },
      });
    } else {
      await prisma.websites.update({
        where: { id: site.id },
        data: {
          script_last_verified_at: site.script_last_verified_at ?? undefined,
          script_last_error: "Tracking script (script.js?websiteId=...) not found on page",
        },
      });
      result.failed++;
      result.errors.push(`Website ${site.domain} (${site.id}): script not found`);
    }
  }

  return result;
}
