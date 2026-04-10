import type { BlogFetchOptions } from "@itsjust-lt/website-kit/blog";
import { normalizeWebsiteId } from "@itsjust-lt/website-kit/env";

function resolveWebsiteId(): string | null {
  const raw =
    process.env.LUMINUM_WEBSITE_ID?.trim() ||
    process.env.NEXT_PUBLIC_LUMINUM_WEBSITE_ID?.trim() ||
    "";
  return raw ? normalizeWebsiteId(raw) : null;
}

/** Server-side blog fetch options. Returns null if no website ID is configured. */
export function tryLuminumBlogOpts(
  extra?: Partial<BlogFetchOptions>
): BlogFetchOptions | null {
  const websiteId = resolveWebsiteId();
  if (!websiteId) return null;
  return {
    websiteId,
    apiBaseUrl: process.env.LUMINUM_API_URL,
    ...extra,
  };
}

/** Same options as {@link tryLuminumBlogOpts} but throws if the website ID is missing (UUID invalid or empty). */
export function luminumBlogOpts(
  extra?: Partial<BlogFetchOptions>
): BlogFetchOptions {
  const opts = tryLuminumBlogOpts(extra);
  if (!opts) {
    throw new Error(
      "Missing LUMINUM_WEBSITE_ID (or NEXT_PUBLIC_LUMINUM_WEBSITE_ID). Copy your Website ID from the Luminum dashboard."
    );
  }
  return opts;
}
