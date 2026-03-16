-- Add organization-level analytics access (admin toggle)
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "analytics_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Add script verification fields to websites for analytics setup check
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "script_last_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "script_last_error" TEXT;
