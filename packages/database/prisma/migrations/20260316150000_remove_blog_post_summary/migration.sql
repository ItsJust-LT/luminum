-- Remove optional blog post summary (use SEO description / content instead)
ALTER TABLE "blog_post" DROP COLUMN IF EXISTS "summary";
