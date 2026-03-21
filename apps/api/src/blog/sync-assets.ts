import type { BlogRenderSpec, RenderSpecBlock } from "./parse-and-validate.js";
import { extractBlogAssetKeyFromPublicUrl } from "./urls.js";
import { prisma } from "../lib/prisma.js";

type BlogAssetDelegate = { blog_asset: (typeof prisma)["blog_asset"] };

function collectUrlsFromValue(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    const k = extractBlogAssetKeyFromPublicUrl(value);
    if (k) out.add(k);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrlsFromValue(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectUrlsFromValue(v, out);
    }
  }
}

function walkComponents(blocks: RenderSpecBlock[], keys: Set<string>): void {
  for (const b of blocks) {
    if (b.type === "component") {
      for (const v of Object.values(b.props)) {
        collectUrlsFromValue(v, keys);
      }
      walkComponents(b.childrenBlocks, keys);
    }
  }
}

/** Collect S3 keys referenced by cover, markdown URLs, and component props in render spec. */
export function collectReferencedBlogKeys(
  coverKey: string,
  markdown: string,
  spec: BlogRenderSpec
): Set<string> {
  const keys = new Set<string>();
  const ck = coverKey?.trim();
  if (ck) keys.add(ck);

  const abs = /https?:\/\/[^\s)"'<>]+/gi;
  let m: RegExpExecArray | null;
  while ((m = abs.exec(markdown)) !== null) {
    const k = extractBlogAssetKeyFromPublicUrl(m[0]!);
    if (k) keys.add(k);
  }
  const rel = /\/api\/public\/blog-assets\/([^)\s"'<>]+)/gi;
  while ((m = rel.exec(markdown)) !== null) {
    try {
      keys.add(decodeURIComponent(m[1]!));
    } catch {
      /* ignore */
    }
  }

  const dashboardProxy = /\/api\/blog-asset\?key=([^)\s"'<>]+)/gi;
  while ((m = dashboardProxy.exec(markdown)) !== null) {
    try {
      keys.add(decodeURIComponent(m[1]!));
    } catch {
      /* ignore */
    }
  }

  walkComponents(spec.blocks, keys);

  return keys;
}

function inferAssetType(s3_key: string): "image" | "file" {
  const ext = s3_key.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"].includes(ext)) return "image";
  return "file";
}

/** Link uploaded blog_asset rows to this post after successful publish. */
export async function syncBlogAssetsToPost(
  db: BlogAssetDelegate,
  organizationId: string,
  postId: string,
  keys: Set<string>
): Promise<void> {
  for (const s3_key of keys) {
    const type = inferAssetType(s3_key);
    await db.blog_asset.upsert({
      where: {
        organization_id_s3_key: { organization_id: organizationId, s3_key },
      },
      create: {
        organization_id: organizationId,
        blog_post_id: postId,
        type,
        s3_key,
        mime: type === "image" ? "image/jpeg" : "application/octet-stream",
        size_bytes: 0,
        original_filename: s3_key.split("/").pop() ?? "asset",
      },
      update: {
        blog_post_id: postId,
      },
    });
  }
}
