-- Track when a client opened (read) an invoice/quote PDF sent via WhatsApp (WhatsApp ack).
ALTER TABLE "invoice" ADD COLUMN "whatsapp_pdf_seen_at" TIMESTAMPTZ(6);
