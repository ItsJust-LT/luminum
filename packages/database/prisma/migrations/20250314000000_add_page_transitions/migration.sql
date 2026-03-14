-- CreateTable
CREATE TABLE "page_transitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "website_id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "from_page" VARCHAR(2048) NOT NULL,
    "to_page" VARCHAR(2048) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_transitions_website_id_created_at_idx" ON "page_transitions"("website_id", "created_at");

-- CreateIndex
CREATE INDEX "page_transitions_website_id_from_page_to_page_idx" ON "page_transitions"("website_id", "from_page", "to_page");

-- CreateIndex
CREATE INDEX "page_transitions_session_id_idx" ON "page_transitions"("session_id");

-- AddForeignKey
ALTER TABLE "page_transitions" ADD CONSTRAINT "page_transitions_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
