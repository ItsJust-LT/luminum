-- Drop legacy embed column; analytics and forms always use websites.id as the only public identifier.
DROP INDEX IF EXISTS "idx_websites_website_id";
ALTER TABLE "websites" DROP COLUMN IF EXISTS "website_id";
