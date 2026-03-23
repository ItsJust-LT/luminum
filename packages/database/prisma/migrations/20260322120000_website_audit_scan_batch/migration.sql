-- Group rows from the same multi-page Lighthouse run
ALTER TABLE "website_audit" ADD COLUMN IF NOT EXISTS "scan_batch_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_website_audit_scan_batch" ON "website_audit"("website_id", "scan_batch_id");
