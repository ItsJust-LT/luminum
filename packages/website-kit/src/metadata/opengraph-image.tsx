import React from "react";

export interface OpenGraphImageProps {
  title: string;
  description?: string;
  coverImageUrl?: string;
  width?: number;
  height?: number;
}

/**
 * A ready-to-use React element for Next.js `opengraph-image.tsx` route handlers
 * using the `ImageResponse` API from `next/og`.
 *
 * Since Next.js `opengraph-image.tsx` must export an `ImageResponse`, the consumer
 * creates the route and calls this to get the JSX tree to pass to `ImageResponse`.
 *
 * @example
 * ```tsx
 * // app/blog/[slug]/opengraph-image.tsx
 * import { ImageResponse } from "next/og";
 * import { getPublishedPostBySlug } from "@itsjust-lt/website-kit/blog";
 * import { generateOpenGraphImageElement } from "@itsjust-lt/website-kit/metadata";
 *
 * export const size = { width: 1200, height: 630 };
 * export const contentType = "image/png";
 *
 * export default async function Image({ params }: { params: { slug: string } }) {
 *   const data = await getPublishedPostBySlug({
 *     websiteId: process.env.LUMINUM_WEBSITE_ID!,
 *     slug: params.slug,
 *   });
 *   if (!data) return new Response("Not found", { status: 404 });
 *   const element = generateOpenGraphImageElement({
 *     title: data.post.title,
 *     description: data.seo.description,
 *     coverImageUrl: data.post.coverImageUrl,
 *   });
 *   return new ImageResponse(element, { ...size });
 * }
 * ```
 */
export function generateOpenGraphImageElement({
  title,
  description,
  coverImageUrl,
  width = 1200,
  height = 630,
}: OpenGraphImageProps): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.3,
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "60px",
          position: "relative",
          zIndex: 1,
          flex: 1,
        }}
      >
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 700,
            lineHeight: 1.15,
            margin: "0 0 16px 0",
            maxWidth: "900px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: "24px",
              color: "#a0a0a0",
              margin: 0,
              maxWidth: "800px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
