import type { BlogRenderSpec } from "./parse-and-validate.js";
import { buildRenderSpecForPublish } from "./parse-and-validate.js";
import { collectReferencedBlogKeys } from "./sync-assets.js";
import { isOrgBlogKey } from "../lib/storage/keys.js";
import * as s3 from "../lib/storage/s3.js";
import { prisma } from "../lib/prisma.js";

type PostLike = {
  organization_id: string;
  cover_image_key: string | null;
  content_markdown: string;
  content_render_spec: unknown | null;
};

/** Keys referenced by cover, markdown URLs, and parsed component props. */
export async function collectKeysForPost(post: PostLike): Promise<Set<string>> {
  const cover = String(post.cover_image_key ?? "").trim();
  const md = String(post.content_markdown ?? "");
  let spec: BlogRenderSpec;
  const raw = post.content_render_spec;
  if (
    raw &&
    typeof raw === "object" &&
    "blocks" in raw &&
    Array.isArray((raw as BlogRenderSpec).blocks)
  ) {
    spec = raw as BlogRenderSpec;
  } else {
    try {
      spec = await buildRenderSpecForPublish(md, post.organization_id);
    } catch {
      spec = { version: 1, blocks: [] };
    }
  }
  return collectReferencedBlogKeys(cover, md, spec);
}

/** Remove S3 objects and blog_asset rows for the given org keys (best-effort S3). */
export async function deleteBlogAssetsForKeys(organizationId: string, keys: Iterable<string>): Promise<void> {
  for (const k of keys) {
    if (!isOrgBlogKey(organizationId, k)) continue;
    if (s3.isStorageConfigured()) {
      try {
        await s3.remove(k);
      } catch (e) {
        console.warn("blog asset S3 delete failed:", k, e);
      }
    }
    await prisma.blog_asset.deleteMany({
      where: { organization_id: organizationId, s3_key: k },
    });
  }
}

/** After an edit, delete storage for keys that were referenced before but not after. */
export async function reconcilePostAssetsAfterEdit(
  organizationId: string,
  previousKeys: Set<string>,
  nextKeys: Set<string>
): Promise<void> {
  const orphan = new Set<string>();
  for (const k of previousKeys) {
    if (!nextKeys.has(k)) orphan.add(k);
  }
  if (orphan.size === 0) return;
  await deleteBlogAssetsForKeys(organizationId, orphan);
}
