import { prisma } from "./prisma.js";
import { checkDomainDkim, checkDomainDmarc, checkDomainMx, checkDomainSpf } from "./email-dns.js";

export interface EmailDnsVerificationResult {
  checked: number;
  disabled: number;
  errors: string[];
}

export async function runEmailDnsVerification(): Promise<EmailDnsVerificationResult> {
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

    const [mx, spf, dkim, dmarc] = await Promise.all([
      checkDomainMx(website.domain),
      checkDomainSpf(website.domain),
      checkDomainDkim(website.domain),
      checkDomainDmarc(website.domain),
    ]);

    const issues: string[] = [];
    if (!mx.ok) issues.push(`MX: ${mx.error || "invalid"}`);
    if (!spf.ok) issues.push(`SPF: ${spf.error || "missing"}`);
    if (!dkim.ok) issues.push(`DKIM: ${dkim.error || "missing"}`);
    if (!dmarc.ok) issues.push(`DMARC: ${dmarc.error || "missing"}`);
    const compositeError = issues.length ? issues.join("; ") : null;

    if (!mx.ok) {
      // MX is authoritative for enabling/disabling email. If MX is wrong, disable email.
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          emails_enabled: false,
          email_dns_verified_at: null,
          email_dns_last_check_at: now,
          email_dns_last_error: compositeError || mx.error || "MX no longer points to expected host",
        },
      });
      result.disabled++;
      result.errors.push(`Org ${org.name} (${org.id}): ${compositeError || mx.error}`);
    } else {
      // MX is good. For legacy orgs that were already verified and had no error,
      // keep them "green" even if SPF/DKIM/DMARC are missing so existing email continues to work normally.
      const hadCleanVerification = !!org.email_dns_verified_at && !org.email_dns_last_error;
      const hasNonMxIssue = !spf.ok || !dkim.ok || !dmarc.ok;
      const errorToStore =
        hadCleanVerification && hasNonMxIssue
          ? org.email_dns_last_error
          : compositeError;

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          email_dns_verified_at: org.email_dns_verified_at ?? now,
          email_dns_last_check_at: now,
          email_dns_last_error: errorToStore,
        },
      });
    }
  }

  return result;
}
