import {
  CreateReceiptRuleCommand,
  CreateReceiptRuleSetCommand,
  DescribeReceiptRuleSetCommand,
  SESClient,
  SetActiveReceiptRuleSetCommand,
  UpdateReceiptRuleCommand,
} from "@aws-sdk/client-ses";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

let sesClassic: SESClient | null | undefined;

function getSesClassicClient(): SESClient | null {
  if (sesClassic === undefined) {
    const region = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "").trim();
    if (!region) {
      sesClassic = null;
      return null;
    }
    sesClassic = new SESClient({ region });
  }
  return sesClassic;
}

function ruleSetName(): string {
  return (process.env.SES_RECEIPT_RULE_SET_NAME || "luminum-ses-inbound").trim();
}

function ruleName(): string {
  return (process.env.SES_RECEIPT_RULE_NAME || "luminum-forward-to-lambda").trim();
}

function lambdaArn(): string {
  return (process.env.SES_INBOUND_LAMBDA_ARN || "").trim();
}

/**
 * Collect distinct lowercased email domains for orgs with mail enabled and a website domain selected.
 */
export async function collectInboundEmailDomains(): Promise<string[]> {
  const orgs = await prisma.organization.findMany({
    where: { emails_enabled: true, email_domain_id: { not: null } },
    select: { email_domain_id: true },
  });
  const ids = [...new Set(orgs.map((o) => o.email_domain_id).filter(Boolean))] as string[];
  if (ids.length === 0) return [];
  const websites = await prisma.websites.findMany({
    where: { id: { in: ids } },
    select: { domain: true },
  });
  const domains = [...new Set(websites.map((w) => w.domain.toLowerCase().replace(/\.$/, "").trim()).filter(Boolean))];
  return domains.sort();
}

/**
 * Ensure receipt rule set exists, is active, and the inbound rule delivers matching domains to Lambda.
 * Skips when SES_INBOUND_LAMBDA_ARN is unset (local dev).
 */
export async function syncSesInboundReceiptRules(): Promise<{ ok: boolean; error?: string; skipped?: boolean; domainCount?: number }> {
  const arn = lambdaArn();
  if (!arn) {
    return { ok: true, skipped: true, domainCount: 0 };
  }
  const client = getSesClassicClient();
  if (!client) {
    return { ok: false, error: "AWS region not configured" };
  }
  const rs = ruleSetName();
  const rn = ruleName();
  const domains = await collectInboundEmailDomains();
  if (domains.length === 0) {
    logger.info("SES receipt rules: no email domains configured; skip sync");
    return { ok: true, domainCount: 0 };
  }

  try {
    try {
      await client.send(new DescribeReceiptRuleSetCommand({ RuleSetName: rs }));
    } catch (e: unknown) {
      const name = e instanceof Error ? e.name : "";
      const msg = e instanceof Error ? e.message : String(e);
      if (name === "RuleSetDoesNotExistException" || /does not exist/i.test(msg)) {
        await client.send(new CreateReceiptRuleSetCommand({ RuleSetName: rs }));
      } else {
        throw e;
      }
    }

    const rule = {
      Name: rn,
      Enabled: true,
      TlsPolicy: "Optional" as const,
      ScanEnabled: false,
      Recipients: domains,
      Actions: [
        {
          LambdaAction: {
            FunctionArn: arn,
            InvocationType: "Event" as const,
          },
        },
        {
          StopAction: {
            Scope: "RuleSet" as const,
          },
        },
      ],
    };

    const described = await client.send(new DescribeReceiptRuleSetCommand({ RuleSetName: rs }));
    const existingNames = new Set((described.Rules ?? []).map((r) => r.Name).filter(Boolean) as string[]);
    if (existingNames.has(rn)) {
      await client.send(
        new UpdateReceiptRuleCommand({
          RuleSetName: rs,
          Rule: rule,
        })
      );
    } else {
      const last = described.Rules?.length ? described.Rules[described.Rules.length - 1]?.Name : undefined;
      await client.send(
        new CreateReceiptRuleCommand({
          RuleSetName: rs,
          ...(last ? { After: last } : {}),
          Rule: rule,
        })
      );
    }

    await client.send(new SetActiveReceiptRuleSetCommand({ RuleSetName: rs }));

    logger.info("SES receipt rules synced", { ruleSet: rs, rule: rn, domainCount: domains.length });
    return { ok: true, domainCount: domains.length };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    logger.error("SES receipt rule sync failed", { error: err });
    return { ok: false, error: err };
  }
}
