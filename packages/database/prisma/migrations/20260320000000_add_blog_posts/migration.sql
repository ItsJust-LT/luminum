-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "blog_post" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "summary" TEXT,
    "content_markdown" TEXT NOT NULL,
    "content_render_spec" JSONB,
    "cover_image_key" TEXT NOT NULL,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "seo_title" VARCHAR(500),
    "seo_description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "blog_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_asset" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "blog_post_id" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "s3_key" TEXT NOT NULL,
    "mime" VARCHAR(255) NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "original_filename" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_organization_id_slug_key" ON "blog_post"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "blog_post_organization_id_idx" ON "blog_post"("organization_id");

-- CreateIndex
CREATE INDEX "blog_post_organization_id_status_idx" ON "blog_post"("organization_id", "status");

-- CreateIndex
CREATE INDEX "blog_post_published_at_idx" ON "blog_post"("published_at");

-- CreateIndex
CREATE INDEX "blog_asset_organization_id_idx" ON "blog_asset"("organization_id");

-- CreateIndex
CREATE INDEX "blog_asset_s3_key_idx" ON "blog_asset"("s3_key");

-- CreateIndex
CREATE INDEX "blog_asset_blog_post_id_idx" ON "blog_asset"("blog_post_id");

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_asset" ADD CONSTRAINT "blog_asset_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_asset" ADD CONSTRAINT "blog_asset_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
