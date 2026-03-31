-- Personal signature overrides org default; scheduled sends record actor for merge at send time.
ALTER TABLE "member" ADD COLUMN "personalEmailSignatureHtml" TEXT;
ALTER TABLE "member" ADD COLUMN "personalEmailSignatureText" TEXT;

ALTER TABLE "email" ADD COLUMN "outbound_scheduled_by_user_id" VARCHAR(255);
