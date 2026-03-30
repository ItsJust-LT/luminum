-- Mail UI: starred, drafts, scheduled sends, updatedAt
ALTER TABLE "email" ADD COLUMN "starred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email" ADD COLUMN "is_draft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email" ADD COLUMN "scheduled_send_at" TIMESTAMPTZ(6);
ALTER TABLE "email" ADD COLUMN "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "email_organization_id_direction_is_draft_idx" ON "email" ("organization_id", "direction", "is_draft");
CREATE INDEX "email_organization_id_scheduled_send_at_idx" ON "email" ("organization_id", "scheduled_send_at");
CREATE INDEX "email_organization_id_starred_idx" ON "email" ("organization_id", "starred");
