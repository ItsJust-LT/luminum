# @itsjust-lt/website-kit

Drop-in package for customer Next.js (App Router) websites. Provides analytics tracking, form submission, blog rendering with SSR/SEO, and Next.js metadata helpers — all powered by a single `websiteId`.

Supports Next.js `14`, `15`, and `16` (App Router).

## Installation

Published to **GitHub Packages** (private). Full setup (GitHub Packages, CI publish, `.npmrc`, `NODE_AUTH_TOKEN`, Next.js `transpilePackages`) is in **[`docs/github-packages.md`](../../docs/github-packages.md)**.

After auth is configured:

```bash
pnpm add @itsjust-lt/website-kit
```

**Next.js 16:** older published lines such as `0.1.x` only declare `next@^14 || ^15`, so pnpm reports an unmet peer on Next 16. Use **`@itsjust-lt/website-kit@^0.3.0`** (or whatever is current in this package’s `version` field after you publish from Luminum):

```bash
pnpm add @itsjust-lt/website-kit@^0.3.0
```

For development inside the Luminum monorepo, depend on `workspace:*` as other packages do.

**Current published versions** are in each package’s `package.json` (`@itsjust-lt/website-kit`, `@itsjust-lt/blog-renderer`). After pulling new Luminum releases, bump the dependency in your site and run `pnpm install` (or publish from this monorepo per [`docs/github-packages.md`](../../docs/github-packages.md)).

## Setting up blog components (Next.js)

Blog posts return a `renderSpec` from the API. **Markdown** becomes sanitized HTML blocks; **custom blocks** (Callout, Image, Gallery, …) are rendered only if you supply a matching **`BlogComponentMap`**. Names and props are enforced on publish by the Luminum API (see [`apps/api/src/blog/allowlist.ts`](../../apps/api/src/blog/allowlist.ts) in this repo, or `GET /api/blog/components` when authenticated to the dashboard).

### 1. Transpile packages

Next must compile the workspace/source packages:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@itsjust-lt/website-kit", "@itsjust-lt/blog-renderer"],
};

export default nextConfig;
```

### 2. Implement the component map

Export a map whose keys are **exactly**: `Callout`, `Image`, `Button`, `Accordion`, `Gallery`, `Video`, `CodeBlock`, `AuthorCard`. Each value is a React component receiving the props stored in `renderSpec` (strings, numbers, booleans, or JSON for `items` / `images`).

```tsx
// app/blog/luminum-blog-map.tsx  (or components/blog/map.tsx)
import type { BlogComponentMap } from "@itsjust-lt/website-kit/blog";

export const luminumBlogMap: BlogComponentMap = {
  Callout: ({ variant, title, children }) => (
    <aside className={`my-6 rounded-lg border p-4 callout-${variant ?? "info"}`}>
      {title ? <p className="mb-2 font-semibold">{title}</p> : null}
      <div className="text-muted-foreground">{children}</div>
    </aside>
  ),
  Image: ({ src, alt, caption, rounded, objectFit, layout, maxWidth }) => (
    <figure className={layout === "full" ? "my-6 w-full" : "my-6 mx-auto max-w-3xl"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full ${rounded === false ? "rounded-none" : "rounded-xl"} ${
          objectFit === "cover" ? "object-cover" : "object-contain"
        }`}
        style={typeof maxWidth === "number" ? { maxWidth } : undefined}
      />
      {caption ? <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  ),
  Button: ({ href, label, variant }) => (
    <a href={href} className={`btn btn-${variant ?? "primary"} my-2 inline-block`}>
      {label}
    </a>
  ),
  Accordion: ({ items }) => {
    const list = Array.isArray(items) ? items : [];
    return (
      <div className="my-6 space-y-2">
        {list.map((item: { title?: string; content?: string }, i: number) => (
          <details key={i} className="rounded-lg border p-3">
            <summary className="cursor-pointer font-medium">{item.title ?? `Section ${i + 1}`}</summary>
            <div className="mt-2 text-sm opacity-90">{item.content}</div>
          </details>
        ))}
      </div>
    );
  },
  Gallery: ({ images, columns }) => {
    const imgs = Array.isArray(images) ? images : [];
    const cols = typeof columns === "number" ? columns : 3;
    return (
      <div className="my-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {imgs.map((img: { src?: string; alt?: string }, i: number) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={img.src} alt={img.alt ?? ""} className="aspect-square w-full rounded-md object-cover" />
        ))}
      </div>
    );
  },
  Video: ({ src, poster, title, width, height }) => (
    <div className="my-6">
      {title ? <p className="mb-1 text-sm font-medium">{title}</p> : null}
      <video src={src} poster={poster} width={width} height={height} controls className="max-w-full rounded-lg" />
    </div>
  ),
  CodeBlock: ({ code, language, filename, showLineNumbers }) => (
    <div className="my-6 overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm">
      {filename ? <div className="mb-2 text-xs text-muted-foreground">{filename}</div> : null}
      <pre>
        <code className={language ? `language-${language}` : undefined}>{code}</code>
      </pre>
    </div>
  ),
  AuthorCard: ({ name, bio, avatarSrc, url }) => (
    <div className="my-6 flex gap-4 rounded-xl border p-4">
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarSrc} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
      ) : null}
      <div>
        {url ? (
          <a href={url} className="font-semibold hover:underline">
            {name}
          </a>
        ) : (
          <p className="font-semibold">{name}</p>
        )}
        {bio ? <p className="mt-1 text-sm text-muted-foreground">{bio}</p> : null}
      </div>
    </div>
  ),
};
```

Style these however your design system requires; the important part is **prop names** matching what the API stores.

### 3. Use the map on the post page

```tsx
import { getPublishedPostBySlug, renderBlogSpec } from "@itsjust-lt/website-kit/blog";
import { luminumBlogMap } from "./luminum-blog-map";

// inside page component:
<div>{renderBlogSpec(data.renderSpec, luminumBlogMap, { rootClassName: "space-y-6" })}</div>
```

Optional third argument: `BlogRenderOptions` — `markdownClassName` (Tailwind Typography / prose) and `rootClassName` wrapper.

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
      <div>{renderBlogSpec(data.renderSpec, componentMap, { rootClassName: "space-y-6" })}</div>
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

Optional third argument to `renderBlogSpec`: `BlogRenderOptions` (`markdownClassName`, `rootClassName`) to tune Tailwind Typography / layout per site.

Blog `fetch` helpers (except when `previewToken` or `noStore` is set) attach `next.tags` including `luminum-blog-{websiteId}` for on-demand revalidation. Pass `revalidateTags: ["my-extra-tag"]` to add more. After a post is published, revalidate from your app (e.g. `revalidateTag` in a Route Handler) if you add a webhook.

Use `fetchBlogPostDetail` as an alias for `getPublishedPostBySlug` when you want the full JSON (`post`, `renderSpec`, `seo`) for a fully custom layout.

### 4. Sitemap

Merge static routes with API-driven blog URLs. If blogs are disabled for the org or the request fails, `getBlogSitemapEntries` returns no blog rows (safe to spread).

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
