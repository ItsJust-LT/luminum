import { prisma } from "./prisma.js";
import { isOrgBlogKey } from "./storage/keys.js";
import { buildRenderSpecForPublish } from "../blog/parse-and-validate.js";
import { collectReferencedBlogKeys, syncBlogAssetsToPost } from "../blog/sync-assets.js";
import { invalidatePublishedBlogCache } from "../blog/blog-cache.js";

/**
 * Publish blog posts that are due (status scheduled, scheduled_publish_at <= now).
 * Skips orgs with blogs disabled or posts missing a valid cover.
 */
export async function runPublishScheduledBlogPosts(): Promise<{
  processed: number;
  published: number;
  skipped: number;
}> {
  const now = new Date();
  const due = await prisma.blog_post.findMany({
    where: {
      status: "scheduled",
      scheduled_publish_at: { lte: now },
    },
    select: {
      id: true,
      organization_id: true,
      slug: true,
      title: true,
      content_markdown: true,
      cover_image_key: true,
      seo_title: true,
      seo_description: true,
      published_at: true,
      organization: { select: { blogs_enabled: true } },
    },
  });

  let published = 0;
  let skipped = 0;

  for (const post of due) {
    if (!post.organization.blogs_enabled) {
      skipped += 1;
      continue;
    }
    const cover = post.cover_image_key?.trim();
    if (!cover || !isOrgBlogKey(post.organization_id, cover)) {
      skipped += 1;
      continue;
    }
    try {
      const renderSpec = await buildRenderSpecForPublish(
        post.content_markdown,
        post.organization_id
      );
      const keys = collectReferencedBlogKeys(cover, post.content_markdown, renderSpec);
      const publishedAt = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.blog_post.update({
          where: { id: post.id },
          data: {
            content_render_spec: renderSpec as object,
            status: "published",
            published_at: publishedAt,
            scheduled_publish_at: null,
          },
        });
        await syncBlogAssetsToPost(tx, post.organization_id, post.id, keys);
      });
      await invalidatePublishedBlogCache(post.organization_id);
      published += 1;
    } catch (err) {
      console.error("Scheduled blog publish failed", post.id, err);
      skipped += 1;
    }
  }

  return { processed: due.length, published, skipped };
}
