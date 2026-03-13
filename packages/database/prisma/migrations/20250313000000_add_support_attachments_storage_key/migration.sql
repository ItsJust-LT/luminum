-- AlterTable
ALTER TABLE "support_attachments" ADD COLUMN IF NOT EXISTS "storage_key" VARCHAR(512);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_support_attachments_storage_key" ON "support_attachments"("storage_key");
