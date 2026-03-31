import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import { getOrgReplyAddress, sendOutboundViaResend } from "./email-send.js";
import { extractEmailAddress } from "./inbound-email-persist.js";
import {
  parseForwardRulesJson,
  wildcardToRegex,
  type ForwardRule,
} from "./mail-organization-json.js";

function parseRecipientEmails(toHeader: string | null | undefined): string[] {
  if (!toHeader?.trim()) return [];
  const raw = toHeader.trim();
  let parts: string[] = [];
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) {
      parts = j.map((x) => (typeof x === "string" ? x : (x as { email?: string })?.email || "")).filter(Boolean);
    } else {
      parts = [String(j)];
    }
  } catch {
    parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const emails: string[] = [];
  for (const p of parts) {
    const e = extractEmailAddress(p).trim().toLowerCase();
    if (e.includes("@")) emails.push(e);
  }
  return [...new Set(emails)];
}

function ruleMatches(rule: ForwardRule, recipientEmails: string[]): boolean {
  if (!rule.enabled) return false;
  if (rule.matchKind === "all") return recipientEmails.length > 0;
  const pat = (rule.pattern || "").trim().toLowerCase();
  if (!pat) return false;
  if (rule.matchKind === "exact") {
    return recipientEmails.some((e) => e === pat);
  }
  const re = wildcardToRegex(pat);
  if (!re) return false;
  return recipientEmails.some((e) => re.test(e));
}

function collectForwardDestinations(rules: ForwardRule[], recipientEmails: string[]): string[] {
  const out: string[] = [];
  for (const rule of rules) {
    if (!ruleMatches(rule, recipientEmails)) continue;
    if (!out.includes(rule.forwardTo)) out.push(rule.forwardTo);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends forward copies for a newly persisted inbound message (best-effort).
 * Skips when rules empty, no recipients, or destination equals an org recipient (loop guard).
 */
export async function deliverInboundForwardCopies(params: {
  organizationId: string;
  toHeader: string | null | undefined;
  subject: string | null | undefined;
  text: string | null | undefined;
  html: string | null | undefined;
  fromHeader: string | null | undefined;
  requestId?: string;
}): Promise<void> {
  const { organizationId, toHeader, subject, text, html, fromHeader, requestId } = params;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { emails_enabled: true, email_forward_rules: true },
  });
  if (!org?.emails_enabled) return;

  const rules = parseForwardRulesJson(org.email_forward_rules);
  if (rules.length === 0) return;

  const recipientEmails = parseRecipientEmails(toHeader || null);
  if (recipientEmails.length === 0) return;

  const destinations = collectForwardDestinations(rules, recipientEmails);
  if (destinations.length === 0) return;

  const safeDest = destinations.filter((d) => !recipientEmails.includes(d));
  if (safeDest.length === 0) {
    logger.warn("Inbound forward skipped (would loop to same mailbox)", { organizationId, requestId });
    return;
  }

  let fromAddr: string;
  let replyTo: string;
  try {
    ({ from: fromAddr, replyTo } = await getOrgReplyAddress(organizationId, "noreply", {
      displayName: "Mail forward",
    }));
  } catch (e) {
    logger.warn("Inbound forward: could not resolve From", {
      organizationId,
      error: e instanceof Error ? e.message : String(e),
      requestId,
    });
    return;
  }

  const subj = (subject && subject.trim()) || "(No subject)";
  const fwdSubject = subj.toLowerCase().startsWith("[forward]") ? subj : `[Forward] ${subj}`;
  const fromLine = (fromHeader && fromHeader.trim()) || "unknown";
  const textBody =
    `Forwarded message\nFrom: ${fromLine}\nTo: ${recipientEmails.join(", ")}\nSubject: ${subj}\n\n---\n\n` +
    (text?.trim() || "(No plain text body)");
  const innerHtml =
    html?.trim() ||
    `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(text?.trim() || "")}</pre>`;
  const htmlBody =
    `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#111827;">` +
    `<p style="margin:0 0 12px;color:#6b7280;font-size:13px;">Forwarded message<br/>` +
    `From: ${escapeHtml(fromLine)}<br/>To: ${escapeHtml(recipientEmails.join(", "))}<br/>Subject: ${escapeHtml(subj)}</p>` +
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />` +
    `${innerHtml}</div>`;

  const messageId = `<${Date.now()}.fwd.${Math.random().toString(36).slice(2)}@forward>`;

  for (const to of safeDest) {
    try {
      await sendOutboundViaResend(organizationId, {
        from: fromAddr,
        replyTo,
        to: [to],
        subject: fwdSubject,
        text: textBody,
        html: htmlBody,
        messageId: `${messageId}.${to.replace(/[^a-z0-9]/gi, "")}`,
      });
      logger.info("Inbound forward sent", { organizationId, to, requestId });
    } catch (e) {
      logger.warn("Inbound forward send failed", {
        organizationId,
        to,
        error: e instanceof Error ? e.message : String(e),
        requestId,
      });
    }
  }
}
