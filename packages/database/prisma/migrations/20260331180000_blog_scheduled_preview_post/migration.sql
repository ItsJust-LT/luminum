-- AlterEnum
ALTER TYPE "BlogPostStatus" ADD VALUE 'scheduled';

-- AlterTable
ALTER TABLE "blog_post" ADD COLUMN IF NOT EXISTS "scheduled_publish_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_post_organization_id_scheduled_publish_at_idx" ON "blog_post"("organization_id", "scheduled_publish_at");

-- AlterTable
ALTER TABLE "blog_preview_token" ADD COLUMN IF NOT EXISTS "blog_post_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_preview_token_blog_post_id_idx" ON "blog_preview_token"("blog_post_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_preview_token_blog_post_id_fkey'
  ) THEN
    ALTER TABLE "blog_preview_token" ADD CONSTRAINT "blog_preview_token_blog_post_id_fkey"
      FOREIGN KEY ("blog_post_id") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
