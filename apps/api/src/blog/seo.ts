import { publicBlogAssetUrl } from "./urls.js";
import { getOrgPublicSiteBase } from "./org-metadata.js";
import { config } from "../config.js";
export type BlogSeoPayload = {
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
};

export function buildBlogSeo(args: {
  organizationId: string;
  organizationMetadata: string | null;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  coverImageKey: string;
  publishedAt: Date | null;
  updatedAt: Date;
}): BlogSeoPayload {
  const siteBase = getOrgPublicSiteBase(args.organizationMetadata) ?? config.appUrl.replace(/\/$/, "");
  const canonicalUrl = `${siteBase}/blog/${encodeURIComponent(args.slug)}`;
  const title = (args.seoTitle?.trim() || args.title).trim();
  const description = (args.seoDescription?.trim() || title).trim();
  const ogImageUrl = publicBlogAssetUrl(args.coverImageKey);
  const publishedTime = args.publishedAt?.toISOString();
  const modifiedTime = args.updatedAt.toISOString();

  return {
    canonicalUrl,
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      images: [{ url: ogImageUrl, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
      modifiedTime,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description,
      url: canonicalUrl,
      datePublished: publishedTime,
      dateModified: modifiedTime,
      image: [ogImageUrl],
    },
  };
}
