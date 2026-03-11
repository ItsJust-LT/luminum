-- Drop existing analytics events table and recreate as our own schema (no external analytics dependency)
DROP TABLE IF EXISTS "events" CASCADE;

CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT,
    "referrer" TEXT,
    "screen_size" TEXT,
    "ip" VARCHAR(45),
    "country" VARCHAR(255),
    "city" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),
    "website_id" UUID,
    "session_id" VARCHAR(255),
    "duration" INTEGER,
    "device_type" VARCHAR(50),
    "user_id" VARCHAR(255),
    "page_title" VARCHAR(500),
    "referrer_domain" VARCHAR(255),
    "browser_name" VARCHAR(50),
    "browser_version" VARCHAR(20),
    "os_name" VARCHAR(50),
    "os_version" VARCHAR(20),
    "url_params" JSONB,
    "referrer_path" TEXT,
    "traffic_source" VARCHAR(50),
    "user_agent" TEXT,
    "utm_params" JSONB,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- Foreign key to websites
ALTER TABLE "events" ADD CONSTRAINT "events_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Indexes for queries and deduplication
CREATE INDEX "idx_events_website_id" ON "events"("website_id");
CREATE INDEX "idx_events_session_id" ON "events"("session_id");
CREATE INDEX "idx_events_browser_name" ON "events"("browser_name");
CREATE INDEX "idx_events_os_name" ON "events"("os_name");
CREATE INDEX "idx_events_referrer_domain" ON "events"("referrer_domain");
CREATE INDEX "idx_events_traffic_source" ON "events"("traffic_source");
CREATE INDEX "idx_events_user_id" ON "events"("user_id");
CREATE INDEX "idx_events_utm_params" ON "events" USING GIN ("utm_params");
