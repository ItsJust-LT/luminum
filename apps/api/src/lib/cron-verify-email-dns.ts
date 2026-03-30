import { prisma } from "./prisma.js";
import { checkDomainDmarc, checkDomainMx, checkDomainSpf } from "./email-dns.js";
import { isEmailSystemEnabled } from "./email-system.js";
import { decryptEmailSecret } from "./email-secrets.js";
import { validateOrgResendDomain } from "./resend-org.js";

export interface EmailDnsVerificationResult {
  checked: number;
  disabled: number;
  errors: string[];
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
      resend_api_key_ciphertext: true,
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

    const [mx, spf, dmarc] = await Promise.all([checkDomainMx(domain), checkDomainSpf(domain), checkDomainDmarc(domain)]);

    const issues: string[] = [];
    if (!mx.ok) issues.push(`MX: ${mx.error || "lookup failed"}`);
    if (!spf.ok) issues.push(`SPF: ${spf.error || "missing"}`);
    if (!dmarc.ok) issues.push(`DMARC: ${dmarc.error || "missing"}`);

    let resendOk = true;
    if (org.resend_api_key_ciphertext) {
      try {
        const apiKey = decryptEmailSecret(org.resend_api_key_ciphertext);
        const v = await validateOrgResendDomain(apiKey, domain);
        resendOk = v.ok;
        if (!v.ok) {
          issues.push(`Resend: ${v.error || "domain check failed"}`);
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              resend_last_validated_at: now,
              resend_last_error: v.error ?? null,
              email_dns_verified_at: null,
              email_dns_last_check_at: now,
              email_dns_last_error: v.error ?? "Resend domain invalid",
            },
          });
          result.disabled++;
          result.errors.push(`Org ${org.name} (${org.id}): ${v.error}`);
          continue;
        }
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            resend_last_validated_at: now,
            resend_last_error: null,
          },
        });
      } catch (e) {
        issues.push(`Resend: ${e instanceof Error ? e.message : String(e)}`);
        resendOk = false;
      }
    }

    const compositeError = issues.length ? issues.join("; ") : null;
    const dnsAdvisoryFail = !spf.ok || !dmarc.ok;

    if (!resendOk) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          email_dns_last_check_at: now,
          email_dns_last_error: compositeError,
        },
      });
      if (!result.errors.some((x) => x.includes(org.id))) {
        result.errors.push(`Org ${org.name} (${org.id}): ${compositeError}`);
      }
      continue;
    }

    if (dnsAdvisoryFail && org.resend_api_key_ciphertext) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          email_dns_last_check_at: now,
          email_dns_last_error: compositeError,
        },
      });
      result.errors.push(`Org ${org.name} (${org.id}): ${compositeError} (advisory)`);
    } else {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          email_dns_last_check_at: now,
          ...(dnsAdvisoryFail ? {} : { email_dns_last_error: null }),
        },
      });
    }
  }

  return result;
}
