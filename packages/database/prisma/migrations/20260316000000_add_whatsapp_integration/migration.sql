-- CreateEnum
CREATE TYPE "WhatsappAccountStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'QR_PENDING', 'CONNECTED', 'ERROR');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "whatsapp_account" (
    "id" TEXT NOT NULL,
    "organization_id" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "status" "WhatsappAccountStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "session_data" BYTEA,
    "qr_code" TEXT,
    "qr_updated_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "connected_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "session_saved_at" TIMESTAMPTZ(6),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMPTZ(6),
    "owner_instance_id" VARCHAR(255),
    "owner_heartbeat_at" TIMESTAMPTZ(6),
    "lease_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_chat" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "contact_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255),
    "last_message_at" TIMESTAMPTZ(6),
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "wa_message_id" VARCHAR(100),
    "client_message_id" VARCHAR(100),
    "from_me" BOOLEAN NOT NULL DEFAULT false,
    "from_number" VARCHAR(20),
    "body" TEXT,
    "type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "media_url" TEXT,
    "mime_type" VARCHAR(100),
    "media_size" INTEGER,
    "raw_metadata" JSONB,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "ack" INTEGER DEFAULT 0,
    "ack_updated_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_account_organization_id_key" ON "whatsapp_account"("organization_id");

-- CreateIndex
CREATE INDEX "whatsapp_account_organization_id_idx" ON "whatsapp_account"("organization_id");

-- CreateIndex
CREATE INDEX "whatsapp_account_status_idx" ON "whatsapp_account"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_chat_account_id_contact_id_key" ON "whatsapp_chat"("account_id", "contact_id");

-- CreateIndex
CREATE INDEX "whatsapp_chat_account_id_idx" ON "whatsapp_chat"("account_id");

-- CreateIndex
CREATE INDEX "whatsapp_chat_last_message_at_idx" ON "whatsapp_chat"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_chat_id_wa_message_id_key" ON "whatsapp_message"("chat_id", "wa_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_chat_id_client_message_id_key" ON "whatsapp_message"("chat_id", "client_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_message_chat_id_idx" ON "whatsapp_message"("chat_id");

-- CreateIndex
CREATE INDEX "whatsapp_message_timestamp_idx" ON "whatsapp_message"("timestamp");

-- AddForeignKey
ALTER TABLE "whatsapp_account" ADD CONSTRAINT "whatsapp_account_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_chat" ADD CONSTRAINT "whatsapp_chat_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "whatsapp_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message" ADD CONSTRAINT "whatsapp_message_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "whatsapp_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
