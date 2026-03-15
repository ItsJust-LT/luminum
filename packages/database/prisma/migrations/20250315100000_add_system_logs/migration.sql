-- CreateTable
CREATE TABLE "system_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service" VARCHAR(64) NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "request_id" VARCHAR(64),

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_system_logs_created_at" ON "system_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_system_logs_service" ON "system_logs"("service");

-- CreateIndex
CREATE INDEX "idx_system_logs_level" ON "system_logs"("level");
