/**
 * Serialize blog widget JSON → JSX accepted by API publish parser.
 * Must match patterns in apps/api blog parse-and-validate + allowlist.
 */

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function defaultWidgetData(name: string): Record<string, unknown> {
  switch (name) {
    case "Gallery":
      return { images: [{ src: "", alt: "" }], columns: 3 };
    case "Accordion":
      return {
        items: [
          { title: "Section 1", content: "Content here" },
          { title: "Section 2", content: "More content" },
        ],
      };
    case "Callout":
      return { variant: "info", title: "Title", body: "Your text here." };
    case "Button":
      return { href: "https://example.com", label: "Click me", variant: "default" };
    case "Video":
      return { src: "", title: "Video title" };
    case "CodeBlock":
      return { language: "javascript", code: "console.log('Hello');", showLineNumbers: true };
    case "AuthorCard":
      return { name: "Author", bio: "Short bio" };
    case "Image":
      return { src: "", alt: "Image", width: 800, height: 600 };
    default:
      return {};
  }
}

export function serializeWidgetToJsx(name: string, data: Record<string, unknown>): string {
  switch (name) {
    case "Gallery": {
      const images = JSON.stringify(data.images ?? []);
      const c = Number(data.columns ?? 3);
      return `<Gallery images=${images} columns=${c} />`;
    }
    case "Accordion": {
      const items = JSON.stringify(data.items ?? []);
      return `<Accordion items=${items} />`;
    }
    case "Callout": {
      const body = String(data.body ?? "");
      return `<Callout variant="${esc(String(data.variant ?? "info"))}" title="${esc(String(data.title ?? ""))}">\n\n${body}\n\n</Callout>`;
    }
    case "Button": {
      const v = data.variant ? ` variant="${esc(String(data.variant))}"` : "";
      return `<Button href="${esc(String(data.href ?? ""))}" label="${esc(String(data.label ?? ""))}"${v} />`;
    }
    case "Video": {
      const poster = data.poster ? ` poster="${esc(String(data.poster))}"` : "";
      const w = data.width != null ? ` width=${Number(data.width)}` : "";
      const h = data.height != null ? ` height=${Number(data.height)}` : "";
      return `<Video src="${esc(String(data.src ?? ""))}" title="${esc(String(data.title ?? ""))}"${poster}${w}${h} />`;
    }
    case "CodeBlock": {
      const code = String(data.code ?? "");
      const lang = String(data.language ?? "text");
      const fn = data.filename ? ` filename="${esc(String(data.filename))}"` : "";
      const lines = data.showLineNumbers === false ? " showLineNumbers=false" : " showLineNumbers=true";
      return `<CodeBlock language="${esc(lang)}" code="${esc(code)}"${fn}${lines} />`;
    }
    case "AuthorCard": {
      const av = data.avatarSrc ? ` avatarSrc="${esc(String(data.avatarSrc))}"` : "";
      const u = data.url ? ` url="${esc(String(data.url))}"` : "";
      return `<AuthorCard name="${esc(String(data.name ?? ""))}" bio="${esc(String(data.bio ?? ""))}"${av}${u} />`;
    }
    case "Image": {
      const cap = data.caption ? ` caption="${esc(String(data.caption))}"` : "";
      return `<Image src="${esc(String(data.src ?? ""))}" alt="${esc(String(data.alt ?? ""))}" width=${Number(data.width ?? 800)} height=${Number(data.height ?? 600)}${cap} />`;
    }
    default:
      return `<${name} />`;
  }
}

/** Best-effort: turn stored JSX lines into widget payload for editor (visual mode). */
export function tryParseWidgetFromSource(name: string, source: string): Record<string, unknown> | null {
  const t = source.trim();
  try {
    if (name === "Gallery") {
      const m = /<Gallery\s+images=(\[[\s\S]*?\])\s+columns=(\d+)\s*\/>/.exec(t);
      if (!m) return null;
      return { images: JSON.parse(m[1]!), columns: Number(m[2]) };
    }
    if (name === "Accordion") {
      const m = /<Accordion\s+items=(\[[\s\S]*?\])\s*\/>/.exec(t);
      if (!m) return null;
      return { items: JSON.parse(m[1]!) };
    }
    if (name === "Callout") {
      const open = /<Callout\s+variant="([^"]*)"\s+title="([^"]*)"\s*>/.exec(t);
      if (!open) return null;
      const close = t.lastIndexOf("</Callout>");
      const inner = close > 0 ? t.slice(open[0].length, close).trim() : "";
      return { variant: open[1], title: open[2], body: inner };
    }
    if (name === "Button") {
      const m =
        /<Button\s+href="([^"]*)"\s+label="([^"]*)"(?:\s+variant="([^"]*)")?\s*\/>/.exec(
          t
        );
      if (!m) return null;
      return { href: m[1], label: m[2], ...(m[3] ? { variant: m[3] } : {}) };
    }
    if (name === "Video") {
      const m =
        /<Video\s+src="([^"]*)"\s+title="([^"]*)"(?:\s+poster="([^"]*)")?(?:\s+width=(\d+))?(?:\s+height=(\d+))?\s*\/>/.exec(
          t
        );
      if (!m) return null;
      return {
        src: m[1],
        title: m[2],
        ...(m[3] ? { poster: m[3] } : {}),
        ...(m[4] ? { width: Number(m[4]) } : {}),
        ...(m[5] ? { height: Number(m[5]) } : {}),
      };
    }
    if (name === "CodeBlock") {
      const m =
        /<CodeBlock\s+language="([^"]*)"\s+code="((?:[^"\\]|\\.)*)"(?:\s+filename="([^"]*)")?(?:\s+showLineNumbers=(true|false))?\s*\/>/
          .exec(t);
      if (!m) return null;
      const code = m[2]!.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      return {
        language: m[1],
        code,
        ...(m[3] ? { filename: m[3] } : {}),
        showLineNumbers: m[4] !== "false",
      };
    }
    if (name === "AuthorCard") {
      const m =
        /<AuthorCard\s+name="([^"]*)"\s+bio="([^"]*)"(?:\s+avatarSrc="([^"]*)")?(?:\s+url="([^"]*)")?\s*\/>/.exec(
          t
        );
      if (!m) return null;
      return {
        name: m[1],
        bio: m[2],
        ...(m[3] ? { avatarSrc: m[3] } : {}),
        ...(m[4] ? { url: m[4] } : {}),
      };
    }
    if (name === "Image") {
      const m =
        /<Image\s+src="([^"]*)"\s+alt="([^"]*)"\s+width=(\d+)\s+height=(\d+)(?:\s+caption="([^"]*)")?\s*\/>/.exec(
          t
        );
      if (!m) return null;
      return {
        src: m[1],
        alt: m[2],
        width: Number(m[3]),
        height: Number(m[4]),
        ...(m[5] ? { caption: m[5] } : {}),
      };
    }
  } catch {
    return null;
  }
  return null;
}
