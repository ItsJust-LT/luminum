import type { BlogSeoPayload } from "../types.js";

/**
 * Convert a Luminum blog SEO payload into a Next.js `Metadata` object.
 * Use in `generateMetadata()` for your blog post pages.
 *
 * @example
 * ```ts
 * // app/blog/[slug]/page.tsx
 * import { getPublishedPostBySlug } from "@itsjust-lt/website-kit/blog";
 * import { blogSeoToMetadata } from "@itsjust-lt/website-kit/metadata";
 *
 * export async function generateMetadata({ params }) {
 *   const data = await getPublishedPostBySlug({
 *     websiteId: process.env.LUMINUM_WEBSITE_ID!,
 *     slug: params.slug,
 *   });
 *   if (!data) return { title: "Not found" };
 *   return blogSeoToMetadata(data.seo);
 * }
 * ```
 */
export function blogSeoToMetadata(seo: BlogSeoPayload): Record<string, unknown> {
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonicalUrl,
    },
    ...(seo.robots ? { robots: seo.robots } : {}),
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      type: seo.openGraph.type,
      images: seo.openGraph.images,
      ...(seo.openGraph.publishedTime
        ? { publishedTime: seo.openGraph.publishedTime }
        : {}),
      ...(seo.openGraph.modifiedTime
        ? { modifiedTime: seo.openGraph.modifiedTime }
        : {}),
    },
    twitter: {
      card: seo.twitter.card,
      title: seo.twitter.title,
      description: seo.twitter.description,
      images: seo.twitter.images,
    },
  };
}
