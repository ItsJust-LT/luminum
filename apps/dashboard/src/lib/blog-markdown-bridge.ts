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

/** JSX-style blog blocks (Callout, Gallery, …) — used for optional raw-Markdown mode hints only. */
export function hasAdvancedBlogBlocks(markdown: string): boolean {
  return /<[A-Z][a-zA-Z0-9]*(\s|\/>|>)/.test(markdown);
}

/** Wrap JSX-style components so marked outputs stable HTML for TipTap (blogComponent node). */
export function preprocessMarkdownJsxToComponentBlocks(markdown: string): string {
  let s = markdown;
  // Self-closing custom components, e.g. <Image ... />
  s = s.replace(/<([A-Z][a-zA-Z0-9]*)\s[^>]*\/>/g, (full) => {
    if (full.includes('data-type="blog-component"')) return full;
    return `<div data-type="blog-component" data-source="${encodeURIComponent(full)}"></div>`;
  });
  // Paired tags, e.g. <Callout>...</Callout> (non-greedy; nested same-name tags are a known limitation)
  s = s.replace(/<([A-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*?)<\/\1>/g, (full) => {
    if (full.includes('data-type="blog-component"')) return full;
    return `<div data-type="blog-component" data-source="${encodeURIComponent(full)}"></div>`;
  });
  return s;
}

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
