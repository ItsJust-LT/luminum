-- CreateTable
CREATE TABLE "server_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hostname" VARCHAR(255),
    "platform" VARCHAR(64),
    "node_version" VARCHAR(32),
    "cpu_usage_percent" DOUBLE PRECISION,
    "cpu_cores" INTEGER,
    "memory_used_bytes" BIGINT,
    "memory_total_bytes" BIGINT,
    "memory_usage_percent" DOUBLE PRECISION,
    "process_heap_used_bytes" BIGINT,
    "process_heap_total_bytes" BIGINT,
    "process_rss_bytes" BIGINT,
    "system_uptime_seconds" DOUBLE PRECISION,
    "process_uptime_seconds" DOUBLE PRECISION,
    "load_avg_1m" DOUBLE PRECISION,
    "load_avg_5m" DOUBLE PRECISION,
    "load_avg_15m" DOUBLE PRECISION,
    "disk_used_bytes" BIGINT,
    "disk_total_bytes" BIGINT,
    "disk_usage_percent" DOUBLE PRECISION,

    CONSTRAINT "server_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_server_metrics_created_at" ON "server_metrics"("created_at");
