import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { serializeWidgetToJsx } from "@/lib/blog-widget-serializer";

marked.setOptions({ gfm: true, breaks: true });

function blogWidgetDiv(name: string, data: Record<string, unknown>): string {
  return `<div data-type="blog-widget" data-name="${name}" data-payload="${encodeURIComponent(JSON.stringify(data))}"></div>`;
}

/**
 * Turn known allowlisted JSX widgets into editor placeholders before marked + TipTap.
 * Runs before generic blog-component wrapping.
 */
export function preprocessMarkdownBlogWidgets(markdown: string): string {
  let s = markdown;

  s = s.replace(
    /<Callout\s+variant="([^"]*)"\s+title="([^"]*)"\s*>([\s\S]*?)<\/Callout>/gi,
    (_full, variant: string, title: string, body: string) => {
      try {
        return blogWidgetDiv("Callout", {
          variant,
          title,
          body: String(body).trim(),
        });
      } catch {
        return _full;
      }
    }
  );

  s = s.replace(/<Gallery\s+images=(\[[\s\S]*?\])\s+columns=(\d+)\s*\/>/gi, (_full, arr: string, cols: string) => {
    try {
      return blogWidgetDiv("Gallery", {
        images: JSON.parse(arr),
        columns: Number(cols),
      });
    } catch {
      return _full;
    }
  });

  s = s.replace(/<Accordion\s+items=(\[[\s\S]*?\])\s*\/>/gi, (_full, items: string) => {
    try {
      return blogWidgetDiv("Accordion", { items: JSON.parse(items) });
    } catch {
      return _full;
    }
  });

  s = s.replace(
    /<Button\s+href="([^"]*)"\s+label="([^"]*)"(?:\s+variant="([^"]*)")?\s*\/>/gi,
    (_full, href: string, label: string, variant?: string) =>
      blogWidgetDiv("Button", { href, label, ...(variant ? { variant } : {}) })
  );

  s = s.replace(
    /<Video\s+src="([^"]*)"\s+title="([^"]*)"(?:\s+poster="([^"]*)")?(?:\s+width=(\d+))?(?:\s+height=(\d+))?\s*\/>/gi,
    (_full, src: string, title: string, poster?: string, width?: string, height?: string) =>
      blogWidgetDiv("Video", {
        src,
        title,
        ...(poster ? { poster } : {}),
        ...(width ? { width: Number(width) } : {}),
        ...(height ? { height: Number(height) } : {}),
      })
  );

  s = s.replace(
    /<CodeBlock\s+language="([^"]*)"\s+code="((?:[^"\\]|\\.)*)"(?:\s+filename="([^"]*)")?(?:\s+showLineNumbers=(true|false))?\s*\/>/gi,
    (_full, language: string, codeEsc: string, filename?: string, showLineNumbers?: string) => {
      const code = codeEsc.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      return blogWidgetDiv("CodeBlock", {
        language,
        code,
        ...(filename ? { filename } : {}),
        showLineNumbers: showLineNumbers !== "false",
      });
    }
  );

  s = s.replace(
    /<AuthorCard\s+name="([^"]*)"\s+bio="([^"]*)"(?:\s+avatarSrc="([^"]*)")?(?:\s+url="([^"]*)")?\s*\/>/gi,
    (_full, name: string, bio: string, avatarSrc?: string, url?: string) =>
      blogWidgetDiv("AuthorCard", {
        name,
        bio,
        ...(avatarSrc ? { avatarSrc } : {}),
        ...(url ? { url } : {}),
      })
  );

  s = s.replace(
    /<Image\s+src="([^"]*)"\s+alt="([^"]*)"\s+width=(\d+)\s+height=(\d+)(?:\s+caption="([^"]*)")?\s*\/>/gi,
    (_full, src: string, alt: string, width: string, height: string, caption?: string) =>
      blogWidgetDiv("Image", {
        src,
        alt,
        width: Number(width),
        height: Number(height),
        ...(caption ? { caption } : {}),
      })
  );

  return s;
}

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

turndown.addRule("blogWidgetBlock", {
  filter(node) {
    return (
      node.nodeName === "DIV" &&
      (node as HTMLElement).getAttribute("data-type") === "blog-widget"
    );
  },
  replacement(_content, node) {
    const el = node as HTMLElement;
    const wname = el.getAttribute("data-name") ?? "Gallery";
    let raw = el.getAttribute("data-payload") ?? encodeURIComponent("{}");
    try {
      raw = decodeURIComponent(raw);
    } catch {
      raw = "{}";
    }
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      return "\n\n" + serializeWidgetToJsx(wname, data) + "\n\n";
    } catch {
      return "\n\n" + raw + "\n\n";
    }
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
  const widgets = preprocessMarkdownBlogWidgets(m);
  const wrapped = preprocessMarkdownJsxToComponentBlocks(widgets);
  return marked.parse(wrapped, { async: false }) as string;
}

/**
 * Turndown treats empty block elements as "blank" and applies blankReplacement
 * before any custom rule runs. Blog widgets serialize as empty <div>s (attrs only),
 * so they were dropped on visual → markdown. A zero-width space makes the node
 * non-blank so blogWidgetBlock runs; it is not emitted in the final markdown.
 */
function preprocessHtmlForBlogWidgets(html: string): string {
  return html.replace(
    /<div(\s[^>]*\bdata-type=["']blog-widget["'][^>]*)>\s*<\/div>/gi,
    "<div$1>\u200b</div>"
  );
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(preprocessHtmlForBlogWidgets(html || "")).trim();
}
