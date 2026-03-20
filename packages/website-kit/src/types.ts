export interface LuminumConfig {
  websiteId: string;
  /** Base URL where the Luminum API is hosted (Express). Defaults to https://api.luminum.app */
  apiBaseUrl?: string;
  /** Base URL where the Luminum Analytics service is hosted (Go). Defaults to https://analytics.luminum.app */
  analyticsBaseUrl?: string;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string;
  publishedAt: string | null;
  categories?: string[];
}

export interface BlogSeoPayload {
  canonicalUrl: string;
  title: string;
  description: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    type: "article";
    images: { url: string; width?: number; height?: number; alt?: string }[];
    publishedTime?: string;
    modifiedTime?: string;
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    images: string[];
  };
  jsonLd?: Record<string, unknown>;
}

export interface BlogPostDetail {
  post: BlogPostSummary;
  renderSpec: import("@luminum/blog-renderer").BlogRenderSpec | null;
  seo: BlogSeoPayload;
}

export interface BlogPostListResponse {
  posts: BlogPostSummary[];
  page: number;
  total: number;
  totalPages: number;
  q?: string | null;
  category?: string | { name: string; slug: string } | null;
  categorySlug?: string | null;
}
