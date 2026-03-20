export { initLuminum, getConfig } from "./config.js";
export type { LuminumConfig, BlogPostSummary, BlogPostDetail, BlogPostListResponse, BlogSeoPayload } from "./types.js";

// Analytics
export { AnalyticsScript, type AnalyticsScriptProps } from "./analytics/index.js";
export { getSessionId } from "./analytics/index.js";

// Forms
export { submitForm, type SubmitFormOptions, type SubmitFormResult } from "./forms/index.js";

// Blog
export {
  getPublishedPosts,
  getPublishedPostBySlug,
  getAllPublishedPosts,
  type BlogFetchOptions,
} from "./blog/index.js";
export { renderBlogSpec, type BlogComponentMap } from "./blog/index.js";
export type { BlogRenderSpec, RenderSpecBlock, MarkdownRenderBlock, ComponentRenderBlock } from "./blog/index.js";

// Metadata
export { getBlogSitemapEntries, type SitemapEntry } from "./metadata/index.js";
export { getRobotsConfig, type RobotsConfig } from "./metadata/index.js";
export { generateOpenGraphImageElement, type OpenGraphImageProps } from "./metadata/index.js";
export { blogSeoToMetadata } from "./metadata/index.js";
