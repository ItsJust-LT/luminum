# @itsjust-lt/blog-renderer

Renders the `renderSpec` object returned by the Luminum API (`GET /api/blog/posts/:slug?organizationId=`) into React elements.

## Usage (Next.js or other React SSR)

1. Fetch the published post from the API (include `organizationId`).
2. Map allowlisted component names to **your** local components (`Callout`, `Image`, `Button`, …).
3. Render `renderBlogSpec(spec, componentMap)` inside your page.

```tsx
import { renderBlogSpec } from "@itsjust-lt/blog-renderer";
import type { BlogRenderSpec } from "@itsjust-lt/blog-renderer";

const componentMap = {
  Callout: YourCallout,
  Image: YourBlogImage,
  Button: YourButton,
};

export default function BlogArticle({ spec }: { spec: BlogRenderSpec }) {
  return <article>{renderBlogSpec(spec, componentMap)}</article>;
}
```

Markdown segments are emitted as sanitized HTML (`type: "markdown"`). Use CSS (e.g. Tailwind Typography `prose`) for styling.

## SEO

Use the API `seo` object for `generateMetadata` / `<head>`:

- `canonicalUrl`, `title`, `description`
- `openGraph.*`, `twitter.*`
- optional `jsonLd`

Set `organization.metadata.publicBaseUrl` (or `baseUrl` / `siteUrl`) so canonical and OG URLs point at your public site, not the API.

## Security

The API only stores sanitized markdown HTML and literal component props. Do not `eval` or pass `componentMap` from untrusted input.
