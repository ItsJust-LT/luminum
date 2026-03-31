-- Allow recurring schedules without a linked invoice (inline JSON template).
-- Optional due date: NULL = generated invoices have no due date.

ALTER TABLE "invoice_schedule" DROP CONSTRAINT IF EXISTS "invoice_schedule_template_invoice_id_fkey";

ALTER TABLE "invoice_schedule" ALTER COLUMN "template_invoice_id" DROP NOT NULL;

ALTER TABLE "invoice_schedule" ADD COLUMN IF NOT EXISTS "template_payload" JSONB;

ALTER TABLE "invoice_schedule" ALTER COLUMN "due_days_after_issue" DROP DEFAULT;
ALTER TABLE "invoice_schedule" ALTER COLUMN "due_days_after_issue" DROP NOT NULL;

ALTER TABLE "invoice_schedule" ADD CONSTRAINT "invoice_schedule_template_invoice_id_fkey"
  FOREIGN KEY ("template_invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
