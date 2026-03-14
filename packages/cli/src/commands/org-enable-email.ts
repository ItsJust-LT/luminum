import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveOrg } from "../lib/resolve.js";
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

export function orgEnableEmailCommand() {
  return new Command("enable-email")
    .description("Enable email for an organization")
    .argument("<id|slug>", "Organization ID or slug")
    .option("--website-id <id>", "Website ID to use as email domain")
    .option("--domain <domain>", "Domain to use (resolves website by domain)")
    .option("--from-address <email>", "Reply-from email address")
    .option("--skip-mx", "Skip MX record validation")
    .action(async (identifier: string, opts: {
      websiteId?: string; domain?: string; fromAddress?: string; skipMx?: boolean;
    }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        let websiteId = opts.websiteId;
        let domain = opts.domain;

        if (!websiteId && !domain) {
          console.error("Provide --website-id or --domain.");
          process.exitCode = 1;
          return;
        }

        if (domain && !websiteId) {
          const website = await prisma.websites.findUnique({ where: { domain } });
          if (!website || website.organization_id !== org.id) {
            console.error(`Website "${domain}" not found or doesn't belong to this organization.`);
            process.exitCode = 1;
            return;
          }
          websiteId = website.id;
        }

        if (websiteId && !domain) {
          const website = await prisma.websites.findUnique({ where: { id: websiteId } });
          if (!website || website.organization_id !== org.id) {
            console.error("Website not found or doesn't belong to this organization.");
            process.exitCode = 1;
            return;
          }
          domain = website.domain;
        }

        if (!opts.skipMx && domain) {
          const mx = await checkMx(domain);
          if (!mx.ok) {
            console.error(`MX check failed for ${domain}: ${mx.error}`);
            process.exitCode = 1;
            return;
          }
        }

        const fromAddress = opts.fromAddress || `replies@${domain}`;
        const now = new Date();

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            emails_enabled: true,
            email_domain_id: websiteId!,
            email_dns_verified_at: now,
            email_dns_last_check_at: now,
            email_dns_last_error: null,
            email_from_address: fromAddress,
          },
        });

        console.log(`Email enabled for "${org.name}" on domain ${domain} (from: ${fromAddress}).`);
      });
    });
}
