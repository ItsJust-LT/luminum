import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { isOrgBlogKey } from "../lib/storage/keys.js";
import { BLOG_COMPONENT_NAMES, BLOG_COMPONENT_PROP_SCHEMAS } from "./allowlist.js";
import { extractBlogAssetKeyFromPublicUrl } from "./urls.js";

export type MarkdownRenderBlock = { type: "markdown"; html: string };
export type ComponentRenderBlock = {
  type: "component";
  name: string;
  props: Record<string, unknown>;
  childrenBlocks: RenderSpecBlock[];
};
export type RenderSpecBlock = MarkdownRenderBlock | ComponentRenderBlock;
export type BlogRenderSpec = { version: 1; blocks: RenderSpecBlock[] };

marked.use({
  gfm: true,
  breaks: true,
});

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "code",
    "pre",
    "hr",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
};

function coerceLiteralValue(raw: string): string | number | boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d*\.\d+$/.test(raw)) return parseFloat(raw);
  return raw;
}

/**
 * Scan a balanced JSON value starting at `start` (which must be `{` or `[`).
 * Returns the index just past the matching closer, respecting string escapes.
 */
function scanJsonValue(s: string, start: number): number {
  const open = s[start]!;
  const close = open === "{" ? "}" : "]";
  let depth = 1;
  let i = start + 1;
  while (i < s.length && depth > 0) {
    const c = s[i]!;
    if (c === '"') {
      i++;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) depth--;
    i++;
  }
  if (depth !== 0) throw new Error(`Unbalanced ${open}${close} in prop value`);
  return i;
}

/**
 * Parse HTML-like attributes with support for:
 * - quoted strings (`"value"` or `'value'`)
 * - bare scalars (`true`, `false`, numbers, unquoted words)
 * - raw JSON literals when value starts with `{` or `[` (validated via JSON.parse)
 */
export function parseLiteralProps(attrString: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let i = 0;
  const len = attrString.length;
  const skipWs = () => {
    while (i < len && /\s/.test(attrString[i]!)) i++;
  };
  while (i < len) {
    skipWs();
    if (i >= len) break;
    const nameStart = i;
    while (i < len && /[a-zA-Z0-9_]/.test(attrString[i]!)) i++;
    const name = attrString.slice(nameStart, i);
    if (!name) throw new Error(`Invalid attribute near position ${i}`);
    skipWs();
    if (attrString[i] === "=") {
      i++;
      skipWs();
      const ch = attrString[i];
      if (ch === "{" || ch === "[") {
        const jsonEnd = scanJsonValue(attrString, i);
        const raw = attrString.slice(i, jsonEnd);
        try {
          out[name] = JSON.parse(raw);
        } catch {
          throw new Error(`Invalid JSON in prop "${name}": ${raw.slice(0, 80)}`);
        }
        i = jsonEnd;
      } else if (ch === '"' || ch === "'") {
        const q = ch;
        i++;
        const start = i;
        while (i < len && attrString[i] !== q) {
          if (attrString[i] === "\\") i++;
          i++;
        }
        out[name] = coerceLiteralValue(attrString.slice(start, i));
        i++;
      } else {
        const start = i;
        while (i < len && !/[\s>\/]/.test(attrString[i]!)) i++;
        out[name] = coerceLiteralValue(attrString.slice(start, i));
      }
    } else {
      out[name] = true;
    }
  }
  return out;
}

function validatePropsAgainstSchema(
  name: string,
  props: Record<string, unknown>
): void {
  const schema = BLOG_COMPONENT_PROP_SCHEMAS[name];
  if (!schema) {
    throw new Error(`No prop schema for component ${name}`);
  }
  for (const [key, spec] of Object.entries(schema)) {
    if (spec.required && props[key] === undefined) {
      throw new Error(`Missing required prop "${key}" on <${name}>`);
    }
    if (props[key] === undefined) continue;
    const v = props[key];
    if (spec.type === "string" && typeof v !== "string") {
      throw new Error(`Prop "${key}" on <${name}> must be a string`);
    }
    if (spec.type === "number" && typeof v !== "number") {
      throw new Error(`Prop "${key}" on <${name}> must be a number`);
    }
    if (spec.type === "boolean" && typeof v !== "boolean") {
      throw new Error(`Prop "${key}" on <${name}> must be a boolean`);
    }
    if (spec.type === "json" && (typeof v !== "object" || v === null)) {
      throw new Error(`Prop "${key}" on <${name}> must be a JSON object or array`);
    }
  }
  for (const key of Object.keys(props)) {
    if (!schema[key]) {
      throw new Error(`Unknown prop "${key}" on <${name}>`);
    }
  }
}

export function readOpenTag(
  src: string,
  start: number
): { name: string; attrString: string; selfClose: boolean; end: number } | null {
  if (src[start] !== "<") return null;
  let i = start + 1;
  if (i >= src.length || !/[A-Z]/.test(src[i]!)) return null;
  const ns = i;
  while (i < src.length && /[a-zA-Z0-9]/.test(src[i]!)) i++;
  const name = src.slice(ns, i);
  const attrStart = i;
  let quote: string | null = null;
  let braceDepth = 0;
  let bracketDepth = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i++;
      continue;
    }
    if (c === "{") { braceDepth++; i++; continue; }
    if (c === "}") { braceDepth--; i++; continue; }
    if (c === "[") { bracketDepth++; i++; continue; }
    if (c === "]") { bracketDepth--; i++; continue; }
    if (braceDepth > 0 || bracketDepth > 0) { i++; continue; }
    if (c === "/" && src[i + 1] === ">") {
      return { name, attrString: src.slice(attrStart, i).trim(), selfClose: true, end: i + 2 };
    }
    if (c === ">") {
      return { name, attrString: src.slice(attrStart, i).trim(), selfClose: false, end: i + 1 };
    }
    i++;
  }
  return null;
}

function findClosingTag(src: string, start: number, name: string): number {
  let depth = 1;
  let pos = start;
  while (pos < src.length) {
    const next = src.indexOf("<", pos);
    if (next === -1) throw new Error(`Unclosed <${name}>`);
    if (src[next + 1] === "/") {
      const m = /^<\/([a-zA-Z0-9]+)\s*>/.exec(src.slice(next));
      if (m) {
        if (m[1] === name) {
          depth--;
          if (depth === 0) return next + m[0].length;
        }
        pos = next + m[0].length;
        continue;
      }
    } else if (/[A-Z]/.test(src[next + 1] || "")) {
      const ot = readOpenTag(src, next);
      if (ot && !ot.selfClose && ot.name === name) depth++;
      pos = ot ? ot.end : next + 1;
      continue;
    }
    pos = next + 1;
  }
  throw new Error(`Unclosed <${name}>`);
}

function validateHtmlImageSrcs(html: string, organizationId: string, ctx: string): void {
  const re = /<img[^>]*\ssrc=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = m[1]!;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) continue;
    const key = extractBlogAssetKeyFromPublicUrl(url);
    if (!key || !isOrgBlogKey(organizationId, key)) {
      throw new Error(`${ctx}: embedded images must use organization blog asset URLs`);
    }
  }
}

async function markdownToSafeHtml(
  segment: string,
  organizationId: string,
  ctx: string
): Promise<string> {
  const trimmed = segment.trim();
  if (!trimmed) return "";
  const html = await marked.parse(trimmed);
  const safe = sanitizeHtml(html, SANITIZE);
  validateHtmlImageSrcs(safe, organizationId, ctx);
  return safe;
}

/**
 * Validate that every http(s) URL in raw markdown that appears in an image is a blog-asset URL for this org.
 */
export function validateMarkdownImageUrls(markdown: string, organizationId: string): void {
  const re = /!\[[^\]]*\]\(\s*([^)\s]+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const url = m[1]!;
    if (!/^https?:\/\//i.test(url)) continue;
    const key = extractBlogAssetKeyFromPublicUrl(url);
    if (!key || !isOrgBlogKey(organizationId, key)) {
      throw new Error(
        "Markdown image URLs must use the organization blog asset URL from the dashboard uploader"
      );
    }
  }
}

function validateSrcProp(
  src: string | undefined,
  organizationId: string,
  ctx: string
): void {
  if (src === undefined) return;
  if (typeof src !== "string") return;
  if (!/^https?:\/\//i.test(src) && !src.startsWith("/")) return;
  const key = extractBlogAssetKeyFromPublicUrl(src);
  if (!key || !isOrgBlogKey(organizationId, key)) {
    throw new Error(`${ctx}: image src must be an organization blog asset URL`);
  }
}

/**
 * Recursively walk a JSON prop value and validate any string that looks like
 * a URL points to a valid org-scoped blog asset.
 */
function validateJsonPropUrls(value: unknown, organizationId: string, ctx: string): void {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) || value.startsWith("/api/public/blog-assets/")) {
      const key = extractBlogAssetKeyFromPublicUrl(value);
      if (key && !isOrgBlogKey(organizationId, key)) {
        throw new Error(`${ctx}: URL must be an organization blog asset URL`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) validateJsonPropUrls(item, organizationId, ctx);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      validateJsonPropUrls(v, organizationId, ctx);
    }
  }
}

async function parseInnerToBlocks(inner: string, organizationId: string): Promise<RenderSpecBlock[]> {
  return parseDocumentToBlocks(inner, organizationId);
}

async function parseDocumentToBlocks(source: string, organizationId: string): Promise<RenderSpecBlock[]> {
  const blocks: RenderSpecBlock[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const lt = source.indexOf("<", cursor);
    if (lt === -1) {
      const rest = source.slice(cursor);
      const html = await markdownToSafeHtml(rest, organizationId, "Markdown");
      if (html) blocks.push({ type: "markdown", html });
      break;
    }
    const ot = readOpenTag(source, lt);
    if (!ot || !BLOG_COMPONENT_NAMES.has(ot.name)) {
      cursor = lt + 1;
      continue;
    }
    const before = source.slice(cursor, lt);
    const htmlBefore = await markdownToSafeHtml(before, organizationId, "Markdown");
    if (htmlBefore) blocks.push({ type: "markdown", html: htmlBefore });

    const props = parseLiteralProps(ot.attrString);
    validatePropsAgainstSchema(ot.name, props);
    if (typeof props.src === "string") validateSrcProp(props.src, organizationId, `<${ot.name}>`);
    if (typeof props.avatarSrc === "string") validateSrcProp(props.avatarSrc, organizationId, `<${ot.name}>`);
    if (typeof props.poster === "string") validateSrcProp(props.poster, organizationId, `<${ot.name}>`);
    for (const [k, v] of Object.entries(props)) {
      if (v && typeof v === "object") validateJsonPropUrls(v, organizationId, `<${ot.name}>.${k}`);
    }

    if (ot.selfClose) {
      blocks.push({ type: "component", name: ot.name, props, childrenBlocks: [] });
      cursor = ot.end;
      continue;
    }
    const closeEnd = findClosingTag(source, ot.end, ot.name);
    const closeTag = `</${ot.name}>`;
    const closeStart = closeEnd - closeTag.length;
    const innerContent = source.slice(ot.end, closeStart);
    const childrenBlocks = await parseInnerToBlocks(innerContent, organizationId);
    blocks.push({ type: "component", name: ot.name, props, childrenBlocks });
    cursor = closeEnd;
  }
  return blocks;
}

/** Full publish pipeline: image URL rules + MDX-like components + markdown to sanitized render spec. */
export async function buildRenderSpecForPublish(
  contentMarkdown: string,
  organizationId: string
): Promise<BlogRenderSpec> {
  validateMarkdownImageUrls(contentMarkdown, organizationId);
  const blocks = await parseDocumentToBlocks(contentMarkdown, organizationId);
  return { version: 1, blocks };
}