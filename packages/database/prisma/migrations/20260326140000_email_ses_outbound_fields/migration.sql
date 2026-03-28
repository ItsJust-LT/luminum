-- Outbound send provider tracking (mail app vs Amazon SES fallback)
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "outbound_provider" VARCHAR(20);
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "fallback_used" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "fallback_reason" TEXT;
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "provider_message_id" VARCHAR(500);

-- Per-org SES domain identity (for fallback eligibility)
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "email_ses_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "email_ses_last_error" TEXT;

CREATE INDEX IF NOT EXISTS "idx_email_outbound_provider" ON "email"("outbound_provider");
