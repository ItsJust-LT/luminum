import { prisma } from "./prisma.js";

const CLIENT_PREFIX = "inv-wa:";

/** Client message id format: inv-wa:{invoiceId}:{timestamp} */
export function invoiceWhatsAppClientMessageId(invoiceId: string): string {
  return `${CLIENT_PREFIX}${invoiceId}:${Date.now()}`;
}

export function parseInvoiceIdFromWaClientMessageId(clientMessageId: string | null | undefined): string | null {
  if (!clientMessageId?.startsWith(CLIENT_PREFIX)) return null;
  const rest = clientMessageId.slice(CLIENT_PREFIX.length);
  const colon = rest.lastIndexOf(":");
  if (colon <= 0) return null;
  const id = rest.slice(0, colon);
  return id || null;
}

export async function markInvoiceWhatsappPdfSeen(invoiceId: string, readAt: Date): Promise<void> {
  await prisma.invoice.updateMany({
    where: { id: invoiceId },
    data: { whatsapp_pdf_seen_at: readAt },
  });
}
