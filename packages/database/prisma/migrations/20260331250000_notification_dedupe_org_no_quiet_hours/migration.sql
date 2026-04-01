-- Drop quiet hours from notification preferences
ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "quiet_hours_start";
ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "quiet_hours_end";

-- Notifications: denormalized org + idempotency key
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" VARCHAR(500);
ALTER TABLE "notifications" ADD COLUMN "organization_id" TEXT;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

CREATE INDEX "idx_notifications_user_organization" ON "notifications"("user_id", "organization_id");
