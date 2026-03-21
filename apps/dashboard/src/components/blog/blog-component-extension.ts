import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Preserves custom blog blocks (Callout, Gallery, …) as opaque source in the visual editor.
 * Round-trips through markdown via blog-markdown-bridge (data-source ↔ JSX).
 */
export const BlogComponentBlock = Node.create({
  name: "blogComponent",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      source: {
        default: "",
        parseHTML: (element) => {
          const raw = (element as HTMLElement).getAttribute("data-source") ?? "";
          try {
            return decodeURIComponent(raw);
          } catch {
            return raw;
          }
        },
        renderHTML: (attributes) => ({
          "data-source": encodeURIComponent(String(attributes.source ?? "")),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="blog-component"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = String(node.attrs.source ?? "");
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "blog-component",
        class: "blog-component-node my-4",
      }),
      [
        "div",
        {
          class:
            "rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] to-muted/50 px-3 py-2.5 text-left font-mono text-[11px] leading-relaxed text-foreground shadow-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto",
        },
        src || "Empty block — pick Block from the toolbar to insert a component.",
      ],
    ];
  },

});
