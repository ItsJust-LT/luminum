import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import { extractMailboxLocalPart, getOrgReplyAddress, sendOutboundViaResend } from "./email-send.js";
import { broadcastOrgEmailOutboundSent } from "./org-ws-broadcast.js";

/**
 * Deliver outbound rows with scheduled_send_at <= now and sent_at null.
 * Safe to call from cron or a periodic timer (multiple API instances may race; send is idempotent per row if one wins the update).
 */
export async function runScheduledEmailOutbox(): Promise<{ processed: number; sent: number; errors: string[] }> {
  const now = new Date();
  const errors: string[] = [];
  let sent = 0;

  const due = await prisma.email.findMany({
    where: {
      direction: "outbound",
      is_draft: false,
      sent_at: null,
      scheduled_send_at: { lte: now, not: null },
      organization_id: { not: null },
    },
    take: 40,
    orderBy: { scheduled_send_at: "asc" },
  });

  for (const row of due) {
    const organizationId = row.organization_id!;
    let toList: string[] = [];
    if (row.to) {
      try {
        const p = JSON.parse(row.to);
        toList = Array.isArray(p) ? p : [p];
      } catch {
        toList = row.to ? [row.to] : [];
      }
    }
    toList = toList.map((t) => String(t).trim()).filter(Boolean);
    if (toList.length === 0 || !row.from || !row.subject) {
      errors.push(`skip ${row.id}: missing to/from/subject`);
      continue;
    }

    const messageId = row.messageId?.trim() || `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;

    let fromAddr = row.from;
    let replyToAddr = row.from;
    try {
      const localPart = row.from ? extractMailboxLocalPart(row.from) : "noreply";
      const resolved = await getOrgReplyAddress(organizationId, localPart);
      fromAddr = resolved.from;
      replyToAddr = resolved.replyTo;
    } catch {
      /* use row.from only */
    }

    try {
      const sendResult = await sendOutboundViaResend(organizationId, {
        from: fromAddr,
        replyTo: replyToAddr,
        to: toList,
        subject: row.subject,
        text: row.text || "",
        html: row.html || undefined,
        messageId,
        inReplyTo: row.in_reply_to || undefined,
        references: row.references || undefined,
      });

      const updated = await prisma.email.updateMany({
        where: { id: row.id, sent_at: null },
        data: {
          messageId: sendResult.messageId,
          sent_at: new Date(),
          scheduled_send_at: null,
          outbound_provider: sendResult.provider,
          provider_message_id: sendResult.providerMessageId ?? null,
        },
      });

      if (updated.count > 0) {
        sent += 1;
        broadcastOrgEmailOutboundSent(organizationId, row.id);
        logger.info("Scheduled email sent", { emailId: row.id, organizationId });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${row.id}: ${msg}`);
      logger.warn("Scheduled email send failed", { emailId: row.id, organizationId, error: msg });
    }
  }

  return { processed: due.length, sent, errors };
}
