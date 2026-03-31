export {
  getPublishedPosts,
  getPublishedPostBySlug,
  getAllPublishedPosts,
  searchPosts,
  getCategories,
  getPostsByCategory,
  type BlogFetchOptions,
  type BlogCategory,
} from "./fetch.js";

export { renderBlogSpec, type BlogComponentMap } from "@itsjust-lt/blog-renderer";
export type {
  BlogRenderSpec,
  RenderSpecBlock,
  MarkdownRenderBlock,
  ComponentRenderBlock,
} from "@itsjust-lt/blog-renderer";
