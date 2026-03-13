import { prisma } from "./prisma.js";
import { checkDomainMx } from "./email-dns.js";

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
    const mx = await checkDomainMx(website.domain);
    const now = new Date();
    if (!mx.ok) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          emails_enabled: false,
          email_dns_verified_at: null,
          email_dns_last_check_at: now,
          email_dns_last_error: mx.error || "MX no longer points to expected host",
        },
      });
      result.disabled++;
      result.errors.push(`Org ${org.name} (${org.id}): ${mx.error}`);
    } else {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          email_dns_verified_at: now,
          email_dns_last_check_at: now,
          email_dns_last_error: null,
        },
      });
    }
  }

  return result;
}
