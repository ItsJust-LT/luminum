# Blog markdown authoring guide

This document describes how to write post content in the Luminum blog pipeline: **GitHub-Flavored Markdown**, a **strict subset of HTML**, and **embeddable components** (PascalCase tags, MDX-like). The API validates everything on **publish**; invalid markup or unknown components are rejected.

Live allowlist and prop schemas are also exposed at **`GET /api/blog/components`** (no auth).

---

## 1. Modes of content

| Kind | What it is |
|------|------------|
| **Markdown** | Headings, lists, links, emphasis, fenced code, tables, etc. (see §2). |
| **HTML** | Only tags listed in §3. Used for alignment (`style`) and structure TipTap may emit. |
| **Components** | Tags like `<Callout …>…</Callout>` or self-closing `<Image … />`. Names must be **PascalCase** and on the server allowlist (§4). |

Plain text lines are Markdown. A line can mix Markdown and inline HTML where allowed.

---

## 2. Markdown (Marked + GFM)

The server uses [Marked](https://marked.js.org/) with:

- **GFM** enabled (tables, strikethrough, task lists, autolinks where applicable).
- **`breaks: true`** — a single newline often becomes a `<br>` in output (soft breaks).

### Recommended patterns

```markdown
# Title

Paragraph with **bold**, *italic*, [link](https://example.com).

- Bullet
- List

1. Ordered
2. List

| Col A | Col B |
| ----- | ----- |
| a     | b     |

> Blockquote

`inline code`

```javascript
// fenced code block
console.log("hi");
```

![Alt text](https://example.com/image.png)
```

### Images in Markdown

`![alt](url)` is allowed. If `url` points at an organization **blog asset** (your API’s `/api/public/blog-assets/...` or dashboard upload URL), it must belong to **your** org or publish will fail.

External `https://` images are generally allowed.

---

## 3. Allowed HTML (sanitized)

After Markdown is converted to HTML, it is passed through **sanitize-html** with this allowlist.

### Tags

`p`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `a`, `ul`, `ol`, `li`, `h1`, `h2`, `h3`, `h4`, `blockquote`, `code`, `pre`, `hr`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `img`.

Anything else (e.g. `div`, `span`, `script`, `iframe`) is **stripped**.

### Attributes

| Tag(s) | Allowed attributes |
|--------|-------------------|
| `a` | `href`, `name`, `target`, `rel` |
| `img` | `src`, `alt`, `width`, `height`, `loading` |
| `th`, `td` | `colspan`, `rowspan`, `style` |
| `p`, `h1`–`h4`, `blockquote`, `li` | `style` (restricted, below) |

### Allowed inline `style` (alignment only)

On `p`, `h1`, `h2`, `h3`, `h4`, `blockquote`, `li`, `th`, `td` only **this** property is kept:

| Property | Allowed values |
|----------|----------------|
| `text-align` | `left`, `right`, `center`, `justify` (case-insensitive) |

Example (centered paragraph):

```html
<p style="text-align: center;"><strong>Website Design</strong></p>
```

Other CSS in `style` is removed.

### Link protocols

Only `http:`, `https:`, and `mailto:` — no `javascript:` or protocol-relative URLs.

---

## 4. Components (PascalCase blocks)

### Syntax rules

1. **Name** must match exactly: `Callout`, `Image`, `Button`, `Accordion`, `Gallery`, `Video`, `CodeBlock`, `AuthorCard`.
2. **Opening tag** uses angle brackets: `<Callout …>` or self-close `<Image … />`.
3. **Attributes** follow JSX-like rules (see §5).
4. **Children** (optional): Markdown and HTML **between** opening and closing tag are parsed as inner content, then nested blocks:

```markdown
<Callout variant="info" title="Note">

Here is **markdown** inside the callout.

</Callout>
```

5. Lowercase tags like `<p>` are **not** components; they stay in the Markdown/HTML stream (§3).

### Self-closing vs paired

- **Self-closing:** `<Button href="…" label="…" />`, `<CodeBlock … />`, `<Accordion … />`, etc.
- **Paired:** `<Callout …> … </Callout>` — inner content becomes child blocks (usually Markdown blocks).

---

## 5. Attribute value rules (parser)

The server parses attributes from the tag header (same idea as `parseLiteralProps`):

| Form | Example |
|------|---------|
| Double-quoted string | `title="Hello"` |
| Single-quoted string | `title='Hello'` |
| Bare word / number / boolean | `columns=3`, `showLineNumbers=true`, `rounded=false` |
| JSON object or array | `items=[{"title":"A","content":"B"}]` — must be valid JSON; can nest `{}` / `[]` with balanced braces |

Inside JSON strings, escape quotes as needed: `\"`.

Boolean attributes without `=` are supported for flags in generic parsers, but the blog schemas use explicit `true`/`false` for booleans.

---

## 6. Component reference (every prop)

Types mirror the API schema: **string**, **number**, **boolean**, **json** (object or array). **Required** props must be present on publish.

### `Callout`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | string | **yes** | Semantic style key for the public site (e.g. `info`, `warning`, `success`, `error`). The API only checks that it is a string; your **theme** decides colors. |
| `title` | string | no | Optional heading above the body. |

**Children:** Markdown/HTML between tags (body of the callout).

**Example:**

```markdown
<Callout variant="info" title="Did you know?">

Supporting copy with **emphasis**.

</Callout>
```

---

### `Image`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | string | **yes** | Image URL — use org blog asset URL from upload, or allowed external `https`. |
| `alt` | string | **yes** | Accessible description. |
| `width` | number | no | Optional display width (px). |
| `height` | number | no | Optional display height (px). |
| `caption` | string | no | Text below the image. |
| `rounded` | boolean | no | If `true`, stronger rounding; `false` square; omitted = default rounding in theme. |
| `objectFit` | string | no | Typical values themes understand: `contain`, `cover`, `fill`. |
| `layout` | string | no | e.g. `full` for full width vs constrained column. |
| `maxWidth` | number | no | Cap width in px (implementations may clamp). |

**Self-closing** (no children).

**Example:**

```markdown
<Image src="https://api.example.com/api/public/blog-assets/org%2F…%2Fimage.webp" alt="Hero" width=1200 height=630 caption="Quarterly review" rounded=true objectFit=cover layout=full />
```

---

### `Button`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `href` | string | **yes** | Destination URL (`https://`, `mailto:`, or site-relative path as your policy allows). |
| `label` | string | **yes** | Visible button text. |
| `variant` | string | no | Theme-specific: e.g. primary / outline / ghost. |

**Self-closing.**

**Example:**

```markdown
<Button href="https://example.com/pricing" label="See pricing" variant="primary" />
```

---

### `Accordion`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | **json** (array) | **yes** | Array of objects; each item should include string fields used by your renderer. |
| *(per item)* | | | |
| `title` | string (in each object) | convention | Section heading. |
| `content` | string (in each object) | convention | Section body (often plain text or short HTML; keep simple). |

**Self-closing** (`items` holds all data).

**Example:**

```markdown
<Accordion items=[{"title":"Section 1","content":"First body."},{"title":"Section 2","content":"Second body."}] />
```

---

### `Gallery`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `images` | **json** (array) | **yes** | List of image objects. |
| *(per image)* | | | |
| `src` | string | **yes** (per item) | Image URL. |
| `alt` | string | **yes** (per item) | Accessible label. |
| `columns` | number | no | Number of columns in the grid (default up to theme, e.g. `3`). |

**Self-closing.**

**Example:**

```markdown
<Gallery images=[{"src":"https://…/a.jpg","alt":"Team"},{"src":"https://…/b.jpg","alt":"Office"}] columns=2 />
```

---

### `Video`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | string | **yes** | Direct video URL (MP4/WebM, etc., as your site supports). |
| `poster` | string | no | Poster image URL. |
| `title` | string | no | Accessible / visible title. |
| `width` | number | no | Optional width. |
| `height` | number | no | Optional height. |

**Self-closing.**

**Example:**

```markdown
<Video src="https://example.com/clip.mp4" poster="https://example.com/poster.jpg" title="Walkthrough" width=960 height=540 />
```

---

### `CodeBlock`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `code` | string | **yes** | Source code text. Prefer double-quoted attribute; for multiline, your editor may insert escaped newlines or you may use a single-line snippet for simple cases. |
| `language` | string | no | Highlighting label, e.g. `javascript`, `typescript`, `bash`. |
| `filename` | string | no | Shown as a file name tab in themed renderers. |
| `showLineNumbers` | boolean | no | `true` / `false`. |

**Self-closing.**

**Example:**

```markdown
<CodeBlock language="javascript" filename="app.ts" code="export const x = 1;" showLineNumbers=true />
```

Long code in practice is often pasted from the dashboard snippet tool or split across publishes as your editor allows.

---

### `AuthorCard`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | **yes** | Author display name. |
| `bio` | string | no | Short biography. |
| `avatarSrc` | string | no | Avatar image URL (blog asset or HTTPS). |
| `url` | string | no | Link for the author name (profile, site). |

**Self-closing.**

**Example:**

```markdown
<AuthorCard name="Jane Doe" bio="Writes about product." avatarSrc="https://…/avatar.jpg" url="https://jane.example" />
```

---

## 7. Mixing components and Markdown

Order matters visually: components and Markdown segments become ordered **blocks** in `renderSpec`.

```markdown
Intro paragraph.

<Gallery images=[{"src":"A","alt":"a"},{"src":"B","alt":"b"}] columns=2 />

Closing thoughts with a [link](https://example.com).
```

---

## 8. Public site rendering

JSON from the API has shape:

```json
{
  "version": 1,
  "blocks": [
    { "type": "markdown", "html": "<p>…</p>" },
    { "type": "component", "name": "Callout", "props": { … }, "childrenBlocks": [ … ] }
  ]
}
```

Your marketing app must map each `name` to a React component with **the same props** (plus `children` when `childrenBlocks` is non-empty). Use `@itsjust-lt/blog-renderer`’s `renderBlogSpec(spec, componentMap)`.

Styling for `variant`, `layout`, `objectFit`, etc. is **defined in your site’s component map**, not in this doc.

---

## 9. Dashboard vs anonymous preview

- **Dashboard** while editing can use same-origin **`/api/blog-asset?key=…`** URLs for drafts.
- **Anonymous preview** may receive `coverImageUrl` and inline asset URLs with **`?previewToken=…`** so images load before publish. Live site visitors use published URLs without a token.

See `blog-ssr-contract.md` for API details.

---

## 10. Quick checklist before publish

- [ ] All `<Component>` names are **exactly** from the allowlist (PascalCase).
- [ ] Required props present; JSON props parse as valid JSON.
- [ ] No forbidden HTML tags.
- [ ] Alignment uses only `text-align: left|right|center|justify` on allowed tags.
- [ ] Org-scoped images use your blog asset URLs where required.

---

## Source of truth in the repo

- Allowlist + prop types: `apps/api/src/blog/allowlist.ts`
- HTML sanitization: `apps/api/src/blog/parse-and-validate.ts` (`SANITIZE`)
- Dashboard preview implementations (reference styling): `apps/dashboard/src/components/blog/dashboard-blog-preview-map.tsx`
- Editor insert snippets: `apps/dashboard/src/components/blog/blog-editor.tsx` (`insertComponentSnippet`)
