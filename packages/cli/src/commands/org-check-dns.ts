import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output, printKeyValue } from "../lib/output.js";
import { resolveOrg } from "../lib/resolve.js";
import dns from "node:dns/promises";

export function orgCheckDnsCommand() {
  return new Command("check-dns")
    .description("Check MX/SPF records for organization email domain")
    .argument("<id|slug>", "Organization ID or slug")
    .option("--spf", "Also check SPF record")
    .option("--json", "Output as JSON")
    .action(async (identifier: string, opts: { spf?: boolean; json?: boolean }) => {
      await withDb(async (prisma) => {
        const org = await resolveOrg(prisma, identifier);
        if (!org) return;

        if (!org.email_domain_id) {
          console.error("No email domain configured for this organization.");
          process.exitCode = 1;
          return;
        }

        const website = await prisma.websites.findUnique({
          where: { id: org.email_domain_id },
          select: { domain: true },
        });

        if (!website) {
          console.error("Email domain website not found.");
          process.exitCode = 1;
          return;
        }

        const result: Record<string, unknown> = { domain: website.domain };

        try {
          const mxRecords = await dns.resolveMx(website.domain);
          result.mx_ok = true;
          result.mx_records = mxRecords.map((r) => `${r.priority} ${r.exchange}`).join(", ");
        } catch (err) {
          result.mx_ok = false;
          result.mx_error = (err as Error).message;
        }

        if (opts.spf) {
          try {
            const txtRecords = await dns.resolveTxt(website.domain);
            const spfRecord = txtRecords.flat().find((r) => r.startsWith("v=spf1"));
            result.spf_found = !!spfRecord;
            result.spf_record = spfRecord || "(none)";
          } catch (err) {
            result.spf_found = false;
            result.spf_error = (err as Error).message;
          }
        }

        if (opts.json) {
          output(result, true);
        } else {
          printKeyValue(result);
        }
      });
    });
}
