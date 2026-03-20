-- Unique org + storage key for blog assets (idempotent upserts on publish)
CREATE UNIQUE INDEX IF NOT EXISTS "blog_asset_organization_id_s3_key_key" ON "blog_asset"("organization_id", "s3_key");
