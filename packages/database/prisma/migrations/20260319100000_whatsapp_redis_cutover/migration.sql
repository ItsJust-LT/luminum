-- WhatsApp Redis-Only Cutover Migration
-- Drops legacy chat/message tables (data now lives in Redis)
-- Creates analytics aggregation table

-- Drop legacy tables (order matters: messages before chats due to FK)
DROP TABLE IF EXISTS "whatsapp_message" CASCADE;
DROP TABLE IF EXISTS "whatsapp_chat" CASCADE;

-- Create persistent analytics table for admin reporting
CREATE TABLE "whatsapp_analytics_daily" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" VARCHAR(255) NOT NULL,
    "day" DATE NOT NULL,
    "messages_sent" INTEGER NOT NULL DEFAULT 0,
    "messages_received" INTEGER NOT NULL DEFAULT 0,
    "media_sent" INTEGER NOT NULL DEFAULT 0,
    "media_received" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for upsert
CREATE UNIQUE INDEX "whatsapp_analytics_daily_organization_id_day_key" ON "whatsapp_analytics_daily"("organization_id", "day");
CREATE INDEX "whatsapp_analytics_daily_organization_id_idx" ON "whatsapp_analytics_daily"("organization_id");
CREATE INDEX "whatsapp_analytics_daily_day_idx" ON "whatsapp_analytics_daily"("day");

-- FK to organization
ALTER TABLE "whatsapp_analytics_daily" ADD CONSTRAINT "whatsapp_analytics_daily_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
