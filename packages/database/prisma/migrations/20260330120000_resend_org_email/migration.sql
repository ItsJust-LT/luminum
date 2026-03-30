-- Per-org Resend credentials (encrypted); remove SES-only org columns
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "resend_api_key_ciphertext" TEXT;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "resend_webhook_secret_ciphertext" TEXT;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "resend_last_validated_at" TIMESTAMPTZ(6);
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "resend_last_error" TEXT;

ALTER TABLE "organization" DROP COLUMN IF EXISTS "email_ses_verified_at";
ALTER TABLE "organization" DROP COLUMN IF EXISTS "email_ses_last_error";
