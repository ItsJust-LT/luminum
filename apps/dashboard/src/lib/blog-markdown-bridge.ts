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

/** Custom JSX-style blog blocks (Callout, Image, …) — use raw markdown mode for these. */
export function hasAdvancedBlogBlocks(markdown: string): boolean {
  return /<[A-Z][a-zA-Z0-9]*(\s|\/>|>)/.test(markdown);
}

export function markdownToHtml(markdown: string): string {
  const m = markdown?.trim() ?? "";
  if (!m) return "<p></p>";
  return marked.parse(m, { async: false }) as string;
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html || "").trim();
}
