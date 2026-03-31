-- Organization-wide email signature and default From local part
ALTER TABLE "organization" ADD COLUMN "email_signature_html" TEXT;
ALTER TABLE "organization" ADD COLUMN "email_signature_text" TEXT;
ALTER TABLE "organization" ADD COLUMN "email_signature_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organization" ADD COLUMN "email_default_from_local" VARCHAR(64);

-- Scheduled sends: store attachments until cron delivers
ALTER TABLE "email" ADD COLUMN "outbound_pending_attachments" JSONB;
