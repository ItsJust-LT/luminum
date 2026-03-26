-- AlterTable
ALTER TABLE "organization" ADD COLUMN "invoices_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "company_name" TEXT NOT NULL,
    "company_email" TEXT,
    "company_phone" TEXT,
    "company_vat" TEXT,
    "company_logo" TEXT,
    "company_address" JSONB,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_phone" TEXT,
    "client_address" JSONB,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL,
    "tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "global_tax_percent" DOUBLE PRECISION,
    "custom_adjustments" JSONB,
    "notes" TEXT,
    "terms" TEXT,
    "pdf_storage_key" TEXT,
    "pdf_generated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_item" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "tax_percent" DOUBLE PRECISION,
    "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "special_tax_rate" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_organization_id_idx" ON "invoice"("organization_id");

-- CreateIndex
CREATE INDEX "invoice_status_idx" ON "invoice"("status");

-- CreateIndex
CREATE INDEX "invoice_invoice_number_organization_id_idx" ON "invoice"("invoice_number", "organization_id");

-- CreateIndex
CREATE INDEX "invoice_item_invoice_id_idx" ON "invoice_item"("invoice_id");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
