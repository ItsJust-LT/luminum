-- AlterTable
ALTER TABLE "website_audit" ADD COLUMN IF NOT EXISTS "trigger_source" VARCHAR(20) NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_website_audit_website_trigger_created" ON "website_audit"("website_id", "trigger_source", "created_at" DESC);
