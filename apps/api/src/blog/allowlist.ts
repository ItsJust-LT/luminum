/**
 * Hardcoded global allowlist for MDX-like blog components (API-enforced on publish).
 */
export const BLOG_COMPONENT_NAMES = new Set([
  "Callout",
  "Image",
  "Button",
  "Accordion",
  "Gallery",
  "Video",
  "CodeBlock",
  "AuthorCard",
]);

export type PropSpec = { type: "string" | "number" | "boolean" | "json"; required?: boolean };

export const BLOG_COMPONENT_PROP_SCHEMAS: Record<string, Record<string, PropSpec>> = {
  Callout: {
    variant: { type: "string", required: true },
    title: { type: "string" },
  },
  Image: {
    src: { type: "string", required: true },
    alt: { type: "string", required: true },
    width: { type: "number" },
    height: { type: "number" },
    caption: { type: "string" },
    rounded: { type: "boolean" },
    objectFit: { type: "string" },
    layout: { type: "string" },
    maxWidth: { type: "number" },
  },
  Button: {
    href: { type: "string", required: true },
    label: { type: "string", required: true },
    variant: { type: "string" },
  },
  Accordion: {
    items: { type: "json", required: true },
  },
  Gallery: {
    images: { type: "json", required: true },
    columns: { type: "number" },
  },
  Video: {
    src: { type: "string", required: true },
    poster: { type: "string" },
    title: { type: "string" },
    width: { type: "number" },
    height: { type: "number" },
  },
  CodeBlock: {
    code: { type: "string", required: true },
    language: { type: "string" },
    filename: { type: "string" },
    showLineNumbers: { type: "boolean" },
  },
  AuthorCard: {
    name: { type: "string", required: true },
    bio: { type: "string" },
    avatarSrc: { type: "string" },
    url: { type: "string" },
  },
};

export function listAllowlistedComponents(): { name: string; props: Record<string, PropSpec> }[] {
  return [...BLOG_COMPONENT_NAMES].sort().map((name) => ({
    name,
    props: BLOG_COMPONENT_PROP_SCHEMAS[name] ?? {},
  }));
}
