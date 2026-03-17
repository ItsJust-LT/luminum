-- Add an admin-controlled WhatsApp "always on" flag per organization.
ALTER TABLE "organization"
ADD COLUMN IF NOT EXISTS "whatsapp_always_on" BOOLEAN NOT NULL DEFAULT false;

