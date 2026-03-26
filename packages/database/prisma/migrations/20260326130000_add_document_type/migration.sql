-- AlterTable
ALTER TABLE "invoice" ADD COLUMN "document_type" VARCHAR(10) NOT NULL DEFAULT 'invoice';

-- CreateIndex
CREATE INDEX "invoice_document_type_idx" ON "invoice"("document_type");
