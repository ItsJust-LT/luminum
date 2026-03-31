# Blog SSR contract (public API + `renderSpec`)

## Organization gate

All public blog JSON and public blog assets require `organization.blogs_enabled === true`. If blogs are disabled, anonymous requests return **404** (no Redis hits first). Preview tokens do not bypass this. Toggling the flag clears Redis keys under `blog:pub:{orgId}:` and `blog:draft:{orgId}:`.

## Endpoints (no auth)

- `GET /api/blog/posts?organizationId={id}&page=1&limit=12` — published posts only. Cached when Redis is configured.
- `GET /api/blog/posts?websiteId={id}&page=1&limit=12` — same as above, resolving organization from website.
- `GET /api/blog/posts/{slug}?organizationId={id}` — published post with `post`, `renderSpec`, and `seo`.
- `GET /api/blog/posts/{slug}?websiteId={id}` — same as above, resolving organization from website.
- `GET /api/public/blog-assets/{key}` — streams an image/file if the key is under `org/{organizationId}/blog/...` and referenced by a **published** post (cover or linked `blog_asset` row).
- `GET /api/blog/asset?key={key}` — **authenticated** members only; streams any org blog object under `org/{orgId}/blog/...` (covers drafts in the dashboard). Prefer the dashboard Next.js proxy `/api/blog-asset?key=` so cookies work same-origin.

## Response shapes

### List

```json
{
  "posts": [
    {
      "id": "...",
      "slug": "my-post",
      "title": "...",
      "coverImageUrl": "https://api.example.com/api/public/blog-assets/org%2F...",
      "publishedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "total": 10,
  "totalPages": 1
}
```

### Detail

- `post`: `{ id, slug, title, coverImageUrl, publishedAt, categories? }`
- `renderSpec`: `{ "version": 1, "blocks": [ ... ] }`
- `seo`: `{ canonicalUrl, title, description, robots?, openGraph, twitter, jsonLd? }` — draft **preview** responses set `preview: true`, `robots: { index: false, follow: false }`, and richer `jsonLd` is omitted or minimized for previews.

Use `seo` in Next.js `generateMetadata` / `<head>`. Ensure `organization.metadata` includes `publicBaseUrl` (or `baseUrl` / `siteUrl`) so `canonicalUrl` and OG URLs point at the **marketing site**, not the API. Emit `seo.jsonLd` with a `<script type="application/ld+json">` when you want Article structured data on the marketing site.

## Scheduling

Posts may have `status: "scheduled"` and `scheduled_publish_at` (future ISO time). They are treated like drafts for **anonymous** list/detail/search until a worker publishes them (`POST /api/cron/publish-scheduled-blogs` with cron secret, or in-process poll via `SCHEDULED_BLOG_POLL_MS`).

## Editor validation (auth)

- `POST /api/blog/posts/{id}/preview-spec` — returns `renderSpec` or **400** with an error message.
- `POST /api/blog/posts/{id}/validate-content` — same parser, **200** with `{ ok: true }` or `{ ok: false, error: "..." }`.

## Preview tokens

Mint: `POST /api/blog/posts/{id}/preview-token` (member). Tokens are scoped to the **post** (`blog_post_id`); only that slug’s draft can be loaded with the token on `GET /api/blog/posts/{slug}?previewToken=`.

## `renderSpec` blocks

- `{ "type": "markdown", "html": "<p>...</p>" }` — sanitized HTML.
- `{ "type": "component", "name": "Callout", "props": { ... }, "childrenBlocks": [ ... ] }` — allowlisted components only; props are JSON-serializable literals.

## Rendering in Next.js

### Using `@itsjust-lt/website-kit` (recommended)

The `@itsjust-lt/website-kit` package wraps blog fetching, rendering, and SEO into a single package. See `packages/website-kit/README.md` for full examples.

```tsx
import { getPublishedPostBySlug, renderBlogSpec } from "@itsjust-lt/website-kit/blog";
import { blogSeoToMetadata } from "@itsjust-lt/website-kit/metadata";
```

### Using `@itsjust-lt/blog-renderer` directly

```tsx
import { renderBlogSpec } from "@itsjust-lt/blog-renderer";
import type { BlogRenderSpec } from "@itsjust-lt/blog-renderer";

const map = {
  Callout: YourCallout,
  Image: YourImage,
  Button: YourButton,
};

export default function Page({ spec }: { spec: BlogRenderSpec }) {
  return <article>{renderBlogSpec(spec, map)}</article>;
}
```

Do not execute arbitrary code from the network response; only render known components from your own `componentMap`.

## Dashboard vs public

Authenticated org members use the same `/api/blog/posts` list route but receive **all** statuses; the public internet receives **published** only for the same path when not a member.
