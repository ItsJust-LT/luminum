-- WhatsApp Expansion: add chat management + messaging+ fields

-- Chat management fields
ALTER TABLE "whatsapp_chat" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_chat" ADD COLUMN "is_muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_chat" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_chat" ADD COLUMN "mute_expiration" TIMESTAMPTZ(6);
ALTER TABLE "whatsapp_chat" ADD COLUMN "labels" JSONB;
ALTER TABLE "whatsapp_chat" ADD COLUMN "customer_note" TEXT;
ALTER TABLE "whatsapp_chat" ADD COLUMN "description" TEXT;

-- Message reply / quote fields
ALTER TABLE "whatsapp_message" ADD COLUMN "quoted_wa_message_id" VARCHAR(100);
ALTER TABLE "whatsapp_message" ADD COLUMN "quoted_body" TEXT;
ALTER TABLE "whatsapp_message" ADD COLUMN "quoted_from" VARCHAR(50);

-- Message action flags
ALTER TABLE "whatsapp_message" ADD COLUMN "is_starred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_message" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_message" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- Reactions (JSON array of {emoji, senderId})
ALTER TABLE "whatsapp_message" ADD COLUMN "reactions" JSONB;
