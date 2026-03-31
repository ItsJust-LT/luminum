import { logger } from "./logger.js";
import { runPublishScheduledBlogPosts } from "./cron-publish-scheduled-blogs.js";

const DEFAULT_POLL_MS = 60_000;

/**
 * Poll for due scheduled blog posts. Set SCHEDULED_BLOG_POLL_MS=0 to disable in-process polling.
 * External schedulers can call POST /api/cron/publish-scheduled-blogs.
 */
export function startBlogScheduledPublisher(): void {
  const raw = (process.env.SCHEDULED_BLOG_POLL_MS || "").trim();
  let ms: number;
  if (raw === "") {
    ms = DEFAULT_POLL_MS;
  } else {
    const parsed = parseInt(raw, 10);
    if (raw === "0" || parsed === 0) return;
    ms = parsed;
  }
  if (!Number.isFinite(ms) || ms < 10_000) return;

  const tick = () => {
    runPublishScheduledBlogPosts()
      .then((r) => {
        if (r.published > 0) {
          logger.info("Scheduled blog poll published", {
            published: r.published,
            processed: r.processed,
          });
        }
      })
      .catch((err) => {
        logger.warn("Scheduled blog poll failed", { error: String(err) });
      });
  };

  tick();
  setInterval(tick, ms);
  logger.info("Blog scheduled publisher started", { intervalMs: ms });
}
