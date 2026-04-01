-- Optional client tax/VAT number; document_type may be 'receipt' (same row as invoices/quotes).
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "client_tax_number" VARCHAR(64);
