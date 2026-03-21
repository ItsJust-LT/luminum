import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

marked.setOptions({ gfm: true, breaks: true });

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});
turndown.use(gfm);

/** JSX-style blog blocks (Callout, Gallery, …) — optional detection. */
export function hasAdvancedBlogBlocks(markdown: string): boolean {
  return /<[A-Z][a-zA-Z0-9]*(\s|\/>|>)/.test(markdown);
}

/** Wrap JSX-style components so marked outputs stable HTML for TipTap (blogComponent node). */
export function preprocessMarkdownJsxToComponentBlocks(markdown: string): string {
  let s = markdown;
  s = s.replace(/<([A-Z][a-zA-Z0-9]*)\s[^>]*\/>/g, (full) => {
    if (full.includes('data-type="blog-component"')) return full;
    return `<div data-type="blog-component" data-source="${encodeURIComponent(full)}"></div>`;
  });
  s = s.replace(/<([A-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*?)<\/\1>/g, (full) => {
    if (full.includes('data-type="blog-component"')) return full;
    return `<div data-type="blog-component" data-source="${encodeURIComponent(full)}"></div>`;
  });
  return s;
}

function hasTextAlignStyle(el: HTMLElement): boolean {
  const style = el.getAttribute("style") || "";
  return /text-align\s*:\s*(left|center|right|justify)/i.test(style);
}

/** Preserve TipTap text-align (inline style) — turndown strips it by default. */
turndown.addRule("preserveTextAlignBlock", {
  filter(node) {
    if (node.nodeType !== 1) return false;
    const el = node as HTMLElement;
    const tag = el.nodeName;
    if (!["P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(tag)) return false;
    return hasTextAlignStyle(el);
  },
  replacement(_content, node) {
    return "\n\n" + (node as HTMLElement).outerHTML + "\n\n";
  },
});

/** Preserve images with dimensions (attrs or inline style from TipTap resize). */
turndown.addRule("preserveSizedImage", {
  filter(node) {
    if (node.nodeName !== "IMG") return false;
    const el = node as HTMLImageElement;
    const st = el.getAttribute("style") || "";
    return !!(
      el.getAttribute("width") ||
      el.getAttribute("height") ||
      el.style?.width ||
      el.style?.height ||
      /width\s*:|height\s*:/i.test(st)
    );
  },
  replacement(_content, node) {
    return "\n\n" + (node as HTMLElement).outerHTML + "\n\n";
  },
});

turndown.addRule("blogComponentBlock", {
  filter(node) {
    return (
      node.nodeName === "DIV" &&
      (node as HTMLElement).getAttribute("data-type") === "blog-component"
    );
  },
  replacement(_content, node) {
    const el = node as HTMLElement;
    const raw = el.getAttribute("data-source") ?? "";
    try {
      return "\n\n" + decodeURIComponent(raw) + "\n\n";
    } catch {
      return "\n\n" + raw + "\n\n";
    }
  },
});

export function markdownToHtml(markdown: string): string {
  const m = markdown?.trim() ?? "";
  if (!m) return "<p></p>";
  const wrapped = preprocessMarkdownJsxToComponentBlocks(m);
  return marked.parse(wrapped, { async: false }) as string;
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html || "").trim();
}
