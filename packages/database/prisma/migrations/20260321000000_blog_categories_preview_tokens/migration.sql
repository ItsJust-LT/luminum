-- Add categories (JSONB array of strings) to blog_post
ALTER TABLE "blog_post" ADD COLUMN "categories" JSONB;

-- GIN index for efficient JSONB containment queries on categories
CREATE INDEX "blog_post_categories_idx" ON "blog_post" USING GIN ("categories");

-- Org-scoped preview tokens for sharing draft blog post previews
CREATE TABLE "blog_preview_token" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_preview_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_preview_token_token_key" ON "blog_preview_token"("token");
CREATE INDEX "blog_preview_token_organization_id_idx" ON "blog_preview_token"("organization_id");
CREATE INDEX "blog_preview_token_token_idx" ON "blog_preview_token"("token");
CREATE INDEX "blog_preview_token_expires_at_idx" ON "blog_preview_token"("expires_at");

ALTER TABLE "blog_preview_token" ADD CONSTRAINT "blog_preview_token_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
