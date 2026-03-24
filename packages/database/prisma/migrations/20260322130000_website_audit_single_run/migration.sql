-- Reset legacy per-route audit data and move to single-run audits.
TRUNCATE TABLE "website_audit_result" CASCADE;
TRUNCATE TABLE "website_audit" CASCADE;

ALTER TABLE "website_audit" DROP COLUMN IF EXISTS "scan_batch_id";
ALTER TABLE "website_audit" ALTER COLUMN "path" DROP NOT NULL;
ALTER TABLE "website_audit" ALTER COLUMN "form_factor" TYPE VARCHAR(10);
ALTER TABLE "website_audit" ALTER COLUMN "form_factor" SET DEFAULT 'both';

DROP INDEX IF EXISTS "idx_website_audit_scan_batch";
