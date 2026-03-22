-- CreateTable
CREATE TABLE "whatsapp_client_event" (
    "id" TEXT NOT NULL,
    "organization_id" VARCHAR(255) NOT NULL,
    "account_id" VARCHAR(255),
    "reason_code" VARCHAR(64) NOT NULL,
    "detail" TEXT NOT NULL,
    "wa_disconnect_reason" TEXT,
    "instance_id" VARCHAR(255),
    "always_on" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_client_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_client_event_organization_id_created_at_idx" ON "whatsapp_client_event"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "whatsapp_client_event_created_at_idx" ON "whatsapp_client_event"("created_at" DESC);

-- CreateIndex
CREATE INDEX "whatsapp_client_event_reason_code_idx" ON "whatsapp_client_event"("reason_code");

-- AddForeignKey
ALTER TABLE "whatsapp_client_event" ADD CONSTRAINT "whatsapp_client_event_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
