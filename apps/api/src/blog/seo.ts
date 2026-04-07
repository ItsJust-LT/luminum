import { publicBlogAssetUrl } from "./urls.js";
import { getOrgPublicSiteBase } from "./org-metadata.js";
import { config } from "../config.js";
export type BlogSeoPayload = {
  canonicalUrl: string;
  title: string;
  description: string;
  /** When set, consumers should map to Next.js `metadata.robots` (e.g. noindex for draft preview). */
  robots?: { index: boolean; follow: boolean };
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
  /** Draft/share preview — minimal JSON-LD and noindex. */
  preview?: boolean;
  /** When set with preview, OG/cover image URLs include this so public asset proxy allows draft assets. */
  previewToken?: string;
}): BlogSeoPayload {
  const siteBase = getOrgPublicSiteBase(args.organizationMetadata) ?? config.appUrl.replace(/\/$/, "");
  const canonicalUrl = `${siteBase}/blog/${encodeURIComponent(args.slug)}`;
  const title = (args.seoTitle?.trim() || args.title).trim();
  const description = (args.seoDescription?.trim() || title).trim();
  const previewTok = args.preview && args.previewToken?.trim() ? args.previewToken.trim() : undefined;
  const ogImageUrl = publicBlogAssetUrl(args.coverImageKey, previewTok ? { previewToken: previewTok } : undefined);
  const publishedTime = args.publishedAt?.toISOString();
  const modifiedTime = args.updatedAt.toISOString();

  if (args.preview) {
    return {
      canonicalUrl,
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: "article",
        images: args.coverImageKey ? [{ url: ogImageUrl, alt: title }] : [],
        ...(publishedTime ? { publishedTime } : {}),
        modifiedTime,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: args.coverImageKey ? [ogImageUrl] : [],
      },
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        url: canonicalUrl,
      },
    };
  }

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
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
      datePublished: publishedTime,
      dateModified: modifiedTime,
      image: args.coverImageKey ? [ogImageUrl] : [],
      publisher: { "@type": "Organization", name: siteBase.replace(/^https?:\/\//, "").split("/")[0] || "Organization" },
    },
  };
}
