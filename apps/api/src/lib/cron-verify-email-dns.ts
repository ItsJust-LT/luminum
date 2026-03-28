import { prisma } from "./prisma.js";
import {
  checkDomainDmarc,
  checkDomainMx,
  checkDomainSpf,
  checkDomainDkim,
  checkSesDkimCnames,
  isSesInboundMode,
} from "./email-dns.js";
import { isEmailSystemEnabled } from "./email-system.js";
import { fetchSesEmailIdentityDetails, isSesSendEnvironmentReady, syncOrganizationSesDomainInDb } from "./email-ses.js";

export interface EmailDnsVerificationResult {
  checked: number;
  disabled: number;
  errors: string[];
}

async function dkimCheckForDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSesInboundMode()) {
    const d = await checkDomainDkim(domain);
    return { ok: d.ok, error: d.error };
  }
  const id = await fetchSesEmailIdentityDetails(domain);
  if (id.error && !id.verificationStatus) {
    return { ok: false, error: `SES: ${id.error}` };
  }
  if (id.dkimStatus === "SUCCESS") {
    return { ok: true };
  }
  if (id.dkimTokens.length === 0) {
    return { ok: false, error: "SES DKIM not ready (no tokens yet)" };
  }
  const c = await checkSesDkimCnames(domain, id.dkimTokens);
  return { ok: c.ok, error: c.ok ? undefined : c.error || "SES DKIM CNAMEs invalid" };
}

export async function runEmailDnsVerification(): Promise<EmailDnsVerificationResult> {
  if (!isEmailSystemEnabled()) {
    return { checked: 0, disabled: 0, errors: [] };
  }
  const orgs = await prisma.organization.findMany({
    where: { emails_enabled: true, email_domain_id: { not: null } },
    select: {
      id: true,
      name: true,
      email_domain_id: true,
      email_dns_last_error: true,
      email_dns_verified_at: true,
    },
  });

  const result: EmailDnsVerificationResult = { checked: 0, disabled: 0, errors: [] };

  for (const org of orgs) {
    if (!org.email_domain_id) continue;
    const website = await prisma.websites.findUnique({
      where: { id: org.email_domain_id },
      select: { domain: true },
    });
    if (!website) {
      result.errors.push(`Org ${org.id}: email domain website not found`);
      continue;
    }
    result.checked++;
    const now = new Date();
    const domain = website.domain;

    const [mx, spf, dkim, dmarc] = await Promise.all([
      checkDomainMx(domain),
      checkDomainSpf(domain),
      dkimCheckForDomain(domain),
      checkDomainDmarc(domain),
    ]);

    const sesIdentityOk =
      isSesInboundMode() && isSesSendEnvironmentReady()
        ? (await fetchSesEmailIdentityDetails(domain)).verificationStatus === "SUCCESS"
        : true;

    const issues: string[] = [];
    if (!mx.ok) issues.push(`MX: ${mx.error || "invalid"}`);
    if (!spf.ok) issues.push(`SPF: ${spf.error || "missing"}`);
    if (!dkim.ok) issues.push(`DKIM: ${dkim.error || "missing"}`);
    if (!dmarc.ok) issues.push(`DMARC: ${dmarc.error || "missing"}`);
    if (isSesInboundMode() && isSesSendEnvironmentReady() && !sesIdentityOk) {
      issues.push("SES: domain identity not verified");
    }
    const compositeError = issues.length ? issues.join("; ") : null;

    if (!mx.ok || !spf.ok || !dkim.ok || !dmarc.ok || (isSesInboundMode() && isSesSendEnvironmentReady() && !sesIdentityOk)) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          email_dns_verified_at: null,
          email_dns_last_check_at: now,
          email_dns_last_error: compositeError || mx.error || "DNS / SES check failed",
        },
      });
      result.disabled++;
      result.errors.push(`Org ${org.name} (${org.id}): ${compositeError || mx.error}`);
    } else {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          email_dns_verified_at: org.email_dns_verified_at ?? now,
          email_dns_last_check_at: now,
          email_dns_last_error: null,
        },
      });
    }

    if (isSesSendEnvironmentReady()) {
      try {
        await syncOrganizationSesDomainInDb(org.id);
      } catch {
        /* ignore SES sync errors in cron */
      }
    }
  }

  return result;
}
