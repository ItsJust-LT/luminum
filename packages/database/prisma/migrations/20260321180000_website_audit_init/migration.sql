-- Baseline website_audit tables (20260321190000 only added trigger_source; tables were never created
-- in a prior migration — production runs migrate deploy only, so ALTER TABLE failed with P3009.)

DO $$ BEGIN
    CREATE TYPE "WebsiteAuditStatus" AS ENUM ('queued', 'running', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "website_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "website_id" UUID NOT NULL,
    "organization_id" VARCHAR(255) NOT NULL,
    "status" "WebsiteAuditStatus" NOT NULL DEFAULT 'queued',
    "target_url" TEXT NOT NULL,
    "path" VARCHAR(2048),
    "form_factor" VARCHAR(10) NOT NULL DEFAULT 'mobile',
    "trigger_source" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "error_message" TEXT,
    "lighthouse_version" VARCHAR(20),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "website_audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "website_audit_result" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "audit_id" UUID NOT NULL,
    "summary" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    CONSTRAINT "website_audit_result_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "website_audit_result_audit_id_key" ON "website_audit_result"("audit_id");

DO $$ BEGIN
    ALTER TABLE "website_audit" ADD CONSTRAINT "website_audit_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "website_audit_result" ADD CONSTRAINT "website_audit_result_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "website_audit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_website_audit_website_completed" ON "website_audit"("website_id", "completed_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_website_audit_org_completed" ON "website_audit"("organization_id", "completed_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_website_audit_status" ON "website_audit"("status");
CREATE INDEX IF NOT EXISTS "idx_website_audit_website_trigger_created" ON "website_audit"("website_id", "trigger_source", "created_at" DESC);
