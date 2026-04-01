-- AlterTable
ALTER TABLE "invoice" ADD COLUMN "source_document_id" TEXT,
ADD COLUMN "job_reference" VARCHAR(120);

-- CreateIndex
CREATE INDEX "invoice_organization_id_job_reference_idx" ON "invoice"("organization_id", "job_reference");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
