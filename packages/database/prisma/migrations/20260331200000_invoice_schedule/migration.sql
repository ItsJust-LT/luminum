-- CreateTable
CREATE TABLE "invoice_schedule" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(200),
    "template_invoice_id" TEXT NOT NULL,
    "frequency" VARCHAR(16) NOT NULL,
    "time_local" VARCHAR(5) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "due_days_after_issue" INTEGER NOT NULL DEFAULT 14,
    "send_email" BOOLEAN NOT NULL DEFAULT false,
    "send_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "email_to_override" VARCHAR(255),
    "whatsapp_phone_override" VARCHAR(32),
    "email_from_local_part" VARCHAR(64),
    "email_message" TEXT,
    "whatsapp_message" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "next_run_at" TIMESTAMPTZ(6) NOT NULL,
    "last_run_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoice_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_schedule_organization_id_idx" ON "invoice_schedule"("organization_id");

-- CreateIndex
CREATE INDEX "invoice_schedule_next_run_at_idx" ON "invoice_schedule"("next_run_at");

-- AddForeignKey
ALTER TABLE "invoice_schedule" ADD CONSTRAINT "invoice_schedule_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_schedule" ADD CONSTRAINT "invoice_schedule_template_invoice_id_fkey" FOREIGN KEY ("template_invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
