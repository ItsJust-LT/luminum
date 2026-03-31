# @itsjust-lt/website-kit

Drop-in package for customer Next.js (App Router) websites. Provides analytics tracking, form submission, blog rendering with SSR/SEO, and Next.js metadata helpers — all powered by a single `websiteId`.

Supports Next.js `14`, `15`, and `16` (App Router).

## Installation

Published to **GitHub Packages** (private). Full setup (GitHub Packages, CI publish, `.npmrc`, `NODE_AUTH_TOKEN`, Next.js `transpilePackages`) is in **[`docs/github-packages.md`](../../docs/github-packages.md)**.

After auth is configured:

```bash
pnpm add @itsjust-lt/website-kit
```

For development inside the Luminum monorepo, depend on `workspace:*` as other packages do.

## Quick Start

### 1. Analytics Tracking

Add the analytics script to your root layout. This tracks page views, manages sessions, and exposes `window.__luminum.getSessionId()` on the client.

```tsx
// app/layout.tsx
import { AnalyticsScript } from "@itsjust-lt/website-kit/analytics";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <AnalyticsScript
          websiteId={process.env.NEXT_PUBLIC_LUMINUM_WEBSITE_ID!}
          analyticsBaseUrl={process.env.NEXT_PUBLIC_LUMINUM_ANALYTICS_URL}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 2. Form Submission

Submit form data from any client component. The session ID is automatically included from the analytics cookie.

```tsx
"use client";

import { useState } from "react";
import { submitForm } from "@itsjust-lt/website-kit/forms";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const formData = new FormData(e.currentTarget);
    const fields: Record<string, string> = {};
    formData.forEach((value, key) => {
      fields[key] = String(value);
    });

    const result = await submitForm({
      websiteId: process.env.NEXT_PUBLIC_LUMINUM_WEBSITE_ID!,
      analyticsBaseUrl: process.env.NEXT_PUBLIC_LUMINUM_ANALYTICS_URL,
      formName: "Contact Form",
      fields,
      // Optional: pass signal/headers/etc.
      // fetchOptions: { signal: controller.signal },
    });

    setStatus(result.ok ? "sent" : "error");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <textarea name="message" placeholder="Message" required />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send"}
      </button>
      {status === "sent" && <p>Thank you!</p>}
      {status === "error" && <p>Something went wrong. Please try again.</p>}
    </form>
  );
}
```

### 3. Blog Pages (SSR + SEO)

Fetch published posts server-side and render using the `renderSpec` with your own component map.

#### Blog List Page

```tsx
// app/blog/page.tsx
import { getPublishedPosts } from "@itsjust-lt/website-kit/blog";
import Link from "next/link";

export default async function BlogPage() {
  const { posts } = await getPublishedPosts({
    websiteId: process.env.LUMINUM_WEBSITE_ID!,
    apiBaseUrl: process.env.LUMINUM_API_URL,
    // Optional caching control for Next.js 14/15/16:
    // revalidateSeconds: 600,
    // noStore: false,
    // fetchOptions: { next: { tags: ["blog"] } },
  });

  return (
    <main>
      <h1>Blog</h1>
      <div>
        {posts.map((post) => (
          <article key={post.id}>
            <Link href={`/blog/${post.slug}`}>
              <img src={post.coverImageUrl} alt={post.title} />
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
```

#### Blog Post Page with SEO

```tsx
// app/blog/[slug]/page.tsx
import { getPublishedPostBySlug, renderBlogSpec, type BlogComponentMap } from "@itsjust-lt/website-kit/blog";
import { blogSeoToMetadata } from "@itsjust-lt/website-kit/metadata";
import { notFound } from "next/navigation";

// Define your component map for custom MDX-like components
const componentMap: BlogComponentMap = {
  Callout: ({ variant, children }: any) => (
    <div className={`callout callout-${variant || "info"}`}>{children}</div>
  ),
  Image: ({ src, alt, caption }: any) => (
    <figure>
      <img src={src} alt={alt || ""} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  ),
  Button: ({ href, label }: any) => (
    <a href={href} className="btn">{label}</a>
  ),
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getPublishedPostBySlug({
    websiteId: process.env.LUMINUM_WEBSITE_ID!,
    apiBaseUrl: process.env.LUMINUM_API_URL,
    slug: params.slug,
  });
  if (!data) return { title: "Not found" };
  return blogSeoToMetadata(data.seo);
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const data = await getPublishedPostBySlug({
    websiteId: process.env.LUMINUM_WEBSITE_ID!,
    apiBaseUrl: process.env.LUMINUM_API_URL,
    slug: params.slug,
  });
  if (!data) notFound();

  return (
    <article>
      <img src={data.post.coverImageUrl} alt={data.post.title} />
      <h1>{data.post.title}</h1>
      <time>{data.post.publishedAt}</time>
      <div>{renderBlogSpec(data.renderSpec, componentMap)}</div>
      {data.seo.jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data.seo.jsonLd) }}
        />
      )}
    </article>
  );
}
```

### 4. Sitemap

```ts
// app/sitemap.ts
import { getBlogSitemapEntries } from "@itsjust-lt/website-kit/metadata";

export default async function sitemap() {
  const blogEntries = await getBlogSitemapEntries({
    websiteId: process.env.LUMINUM_WEBSITE_ID!,
    apiBaseUrl: process.env.LUMINUM_API_URL,
    baseUrl: "https://yoursite.com",
  });

  return [
    { url: "https://yoursite.com", lastModified: new Date() },
    { url: "https://yoursite.com/about", lastModified: new Date() },
    ...blogEntries,
  ];
}
```

### 5. Robots.txt

```ts
// app/robots.ts
import { getRobotsConfig } from "@itsjust-lt/website-kit/metadata";

export default function robots() {
  return getRobotsConfig({
    baseUrl: "https://yoursite.com",
    disallow: ["/admin", "/api"],
  });
}
```

### 6. OpenGraph Image

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getPublishedPostBySlug } from "@itsjust-lt/website-kit/blog";
import { generateOpenGraphImageElement } from "@itsjust-lt/website-kit/metadata";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const data = await getPublishedPostBySlug({
    websiteId: process.env.LUMINUM_WEBSITE_ID!,
    apiBaseUrl: process.env.LUMINUM_API_URL,
    slug: params.slug,
  });
  if (!data) return new Response("Not found", { status: 404 });

  const element = generateOpenGraphImageElement({
    title: data.post.title,
    description: data.seo.description,
    coverImageUrl: data.post.coverImageUrl,
  });

  return new ImageResponse(element, { ...size });
}
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LUMINUM_WEBSITE_ID` | Yes | Your website ID from the Luminum dashboard |
| `NEXT_PUBLIC_LUMINUM_WEBSITE_ID` | Yes (client) | Same as above, exposed to browser for forms |
| `LUMINUM_API_URL` | No | Express API base URL (default: `https://api.luminum.app`) |
| `NEXT_PUBLIC_LUMINUM_ANALYTICS_URL` | No | Go analytics base URL (default: `https://analytics.luminum.app`) |

## Next.js 16 Compatibility

- `@itsjust-lt/website-kit` now declares peer support for `next@^16`.
- Keep `transpilePackages` enabled in your consumer project:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@itsjust-lt/website-kit", "@itsjust-lt/blog-renderer"],
};

export default nextConfig;
```

## Advanced Fetch Controls

Blog fetch functions (`getPublishedPosts`, `getPublishedPostBySlug`, `searchPosts`, etc.) accept:

- `revalidateSeconds?: number` - override default ISR revalidate window (`300`).
- `noStore?: boolean` - force uncached fetches (`cache: "no-store"`).
- `fetchOptions?: RequestInit` - pass `signal`, custom headers, or `next: { tags: [...] }`.

Example:

```ts
const data = await getPublishedPostBySlug({
  websiteId: process.env.LUMINUM_WEBSITE_ID!,
  slug,
  revalidateSeconds: 60,
  fetchOptions: { next: { tags: ["blog-post", slug] } },
});
```

## Exports

| Import Path | Exports |
|---|---|
| `@itsjust-lt/website-kit` | Everything (barrel) |
| `@itsjust-lt/website-kit/analytics` | `AnalyticsScript`, `getSessionId` |
| `@itsjust-lt/website-kit/forms` | `submitForm` |
| `@itsjust-lt/website-kit/blog` | `getPublishedPosts`, `getPublishedPostBySlug`, `getAllPublishedPosts`, `renderBlogSpec` |
| `@itsjust-lt/website-kit/metadata` | `getBlogSitemapEntries`, `getRobotsConfig`, `generateOpenGraphImageElement`, `blogSeoToMetadata` |
