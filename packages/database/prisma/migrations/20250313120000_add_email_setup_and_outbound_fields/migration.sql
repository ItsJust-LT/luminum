-- AlterTable (email: direction, threading, sent_at)
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "direction" VARCHAR(20) NOT NULL DEFAULT 'inbound';
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "in_reply_to" TEXT;
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "references" TEXT;
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMPTZ(6);

-- CreateIndex (email)
CREATE INDEX IF NOT EXISTS "email_direction_idx" ON "email"("direction");

-- AlterTable (organization: email setup fields)
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "email_domain_id" UUID;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "email_dns_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "email_dns_last_check_at" TIMESTAMPTZ(6);
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "email_dns_last_error" TEXT;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "email_from_address" VARCHAR(255);

-- CreateIndex (organization)
CREATE INDEX IF NOT EXISTS "idx_organization_email_domain_id" ON "organization"("email_domain_id");

-- AddForeignKey (organization.email_domain_id -> websites.id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_email_domain_id_fkey'
  ) THEN
    ALTER TABLE "organization" ADD CONSTRAINT "organization_email_domain_id_fkey"
      FOREIGN KEY ("email_domain_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
