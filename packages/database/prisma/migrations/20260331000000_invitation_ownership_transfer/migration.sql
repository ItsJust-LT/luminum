-- AlterTable
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "ownership_transfer" BOOLEAN NOT NULL DEFAULT false;
