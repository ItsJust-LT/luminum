import { prisma } from "./prisma.js";
import { getOrgReplyAddress, sendOutboundViaResend } from "./email-send.js";
import { mergeOutboundWithSignature } from "./email-outbound-body.js";
import { broadcastOrgEmailOutboundSent } from "./org-ws-broadcast.js";
import { sendDocumentMessage } from "../whatsapp/manager.js";
import { normalizePhoneDigitsForWhatsApp } from "./phone-whatsapp-normalize.js";
import { invoiceWhatsAppClientMessageId } from "./invoice-whatsapp-read-receipt.js";
import { ensureInvoicePdfBuffer, type InvoiceWithItems } from "./invoice-pdf-helpers.js";

function phoneToWhatsappJid(raw: string): string | null {
  const digits = normalizePhoneDigitsForWhatsApp(raw);
  if (!digits) return null;
  return `${digits}@c.us`;
}

export async function sendInvoiceEmailSystem(opts: {
  organizationId: string;
  invoice: InvoiceWithItems;
  to: string;
  message?: string;
  fromLocalPart?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { organizationId, invoice, to, message, fromLocalPart } = opts;
  try {
    let from: string;
    let replyTo: string;
    ({ from, replyTo } = await getOrgReplyAddress(organizationId, fromLocalPart, {
      displayName: undefined,
    }));

    const isQuote = invoice.document_type === "quote";
    const docWord = isQuote ? "Quote" : "Invoice";
    const subject = `${docWord} ${invoice.invoice_number} from ${invoice.company_name}`;
    const text =
      (message && String(message).trim()) ||
      `Please find your ${docWord.toLowerCase()} attached.\n\nThank you.`;

    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const invoiceBodyHtml =
      `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.55;color:#111827;max-width:560px;">` +
      `<p style="margin:0 0 10px;font-size:17px;font-weight:600;color:#111827;">${escapeHtml(docWord)} ${escapeHtml(invoice.invoice_number)}</p>` +
      `<p style="margin:0 0 18px;color:#374151;">${escapeHtml(text).replace(/\n/g, "<br/>")}</p>` +
      `<p style="margin:0;font-size:14px;color:#6b7280;">${escapeHtml(invoice.company_name)}</p></div>`;

    const merged = await mergeOutboundWithSignature(
      organizationId,
      { text, html: invoiceBodyHtml },
      { actorUserId: null }
    );

    const pdfBuffer = await ensureInvoicePdfBuffer(invoice);
    const prefix = isQuote ? "quote" : "invoice";
    const filename = `${prefix}-${invoice.invoice_number.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;

    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@scheduled-invoice>`;
    const sendResult = await sendOutboundViaResend(organizationId, {
      from,
      replyTo,
      to: [to],
      subject,
      text: merged.text,
      html: merged.html,
      attachments: [
        {
          filename,
          contentType: "application/pdf",
          contentBase64: pdfBuffer.toString("base64"),
        },
      ],
      messageId,
    });

    const emailRecord = await prisma.email.create({
      data: {
        organization_id: organizationId,
        from,
        to: JSON.stringify([to]),
        subject,
        text: merged.text,
        html: merged.html ?? null,
        direction: "outbound",
        messageId: sendResult.messageId,
        sent_at: new Date(),
        receivedAt: null,
        read: true,
        starred: false,
        is_draft: false,
        outbound_provider: sendResult.provider,
        fallback_used: false,
        fallback_reason: null,
        provider_message_id: sendResult.providerMessageId ?? null,
      },
    });
    broadcastOrgEmailOutboundSent(organizationId, emailRecord.id);

    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  }
}

export async function sendInvoiceWhatsAppSystem(opts: {
  organizationId: string;
  invoice: InvoiceWithItems;
  phone: string;
  message?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { organizationId, invoice, phone, message } = opts;
  try {
    const jid = phoneToWhatsappJid(phone);
    if (!jid) {
      return { ok: false, error: "Invalid phone number for WhatsApp" };
    }

    const pdfBuffer = await ensureInvoicePdfBuffer(invoice);
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    const isQuote = invoice.document_type === "quote";
    const docWord = isQuote ? "Quote" : "Invoice";
    const prefix = isQuote ? "quote" : "invoice";
    const filename = `${prefix}-${invoice.invoice_number.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
    const caption =
      (message && String(message).trim()) ||
      `Here is your ${docWord.toLowerCase()} ${invoice.invoice_number} from ${invoice.company_name}.`;

    await sendDocumentMessage({
      organizationId,
      chatId: jid,
      dataUrl,
      filename,
      caption,
      clientMessageId: invoiceWhatsAppClientMessageId(invoice.id),
    });

    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  }
}
