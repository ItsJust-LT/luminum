export { initLuminum, getConfig } from "./config.js";
export type { LuminumConfig, BlogPostSummary, BlogPostDetail, BlogPostListResponse, BlogSeoPayload } from "./types.js";

export {
  assertLuminumWebsiteIdsAtBuild,
  assertWebsiteId,
  normalizeWebsiteId,
  isValidWebsiteId,
} from "./env/assert-website-id.js";

// Analytics
export { AnalyticsScript, type AnalyticsScriptProps } from "./analytics/index.js";
export { getSessionId } from "./analytics/index.js";

// Forms
export { submitForm, type SubmitFormOptions, type SubmitFormResult } from "./forms/index.js";

// Blog
export {
  getPublishedPosts,
  getPublishedPostBySlug,
  fetchBlogPostDetail,
  getAllPublishedPosts,
  type BlogFetchOptions,
} from "./blog/index.js";
export {
  renderBlogSpec,
  type BlogComponentMap,
  type BlogRenderOptions,
} from "./blog/index.js";
export type { BlogRenderSpec, RenderSpecBlock, MarkdownRenderBlock, ComponentRenderBlock } from "./blog/index.js";

// Metadata
export {
  getBlogSitemapEntries,
  getStaticSitemapEntries,
  getWebsiteSitemapEntries,
  type SitemapEntry,
  type StaticSitemapOptions,
  type WebsiteSitemapOptions,
} from "./metadata/index.js";
export { getRobotsConfig, type RobotsConfig } from "./metadata/index.js";
export { generateOpenGraphImageElement, type OpenGraphImageProps } from "./metadata/index.js";
export { blogSeoToMetadata } from "./metadata/index.js";
