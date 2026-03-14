import { Command } from "commander";
import { withDb } from "../lib/db.js";
import dns from "node:dns/promises";

async function checkMx(domain: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      return { ok: false, error: "No MX records found" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function cronVerifyEmailDnsCommand() {
  return new Command("verify-email-dns")
    .description("Re-check MX records for all orgs with email enabled")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      await withDb(async (prisma) => {
        const orgs = await prisma.organization.findMany({
          where: { emails_enabled: true, email_domain_id: { not: null } },
          select: { id: true, name: true, email_domain_id: true },
        });

        const result = { checked: 0, disabled: 0, errors: [] as string[] };

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
          const mx = await checkMx(website.domain);
          const now = new Date();

          if (!mx.ok) {
            await prisma.organization.update({
              where: { id: org.id },
              data: {
                emails_enabled: false,
                email_dns_verified_at: null,
                email_dns_last_check_at: now,
                email_dns_last_error: mx.error || "MX no longer valid",
              },
            });
            result.disabled++;
            result.errors.push(`${org.name} (${org.id}): ${mx.error}`);
          } else {
            await prisma.organization.update({
              where: { id: org.id },
              data: {
                email_dns_last_check_at: now,
                email_dns_last_error: null,
              },
            });
          }
        }

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Checked: ${result.checked}`);
          console.log(`Disabled: ${result.disabled}`);
          if (result.errors.length > 0) {
            console.log("Errors:");
            for (const e of result.errors) console.log(`  - ${e}`);
          }
        }
      });
    });
}
