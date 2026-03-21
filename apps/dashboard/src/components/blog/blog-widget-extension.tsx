"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { BlogWidgetView } from "./blog-widget-view";

function decodePayload(raw: string | null): string {
  if (raw == null || raw === "") return "{}";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Structured allowlisted blog blocks (Gallery, Accordion, …) with a React editor surface.
 * Serializes to JSX in markdown via blog-markdown-bridge turndown.
 */
export const BlogWidget = Node.create({
  name: "blogWidget",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      name: {
        default: "Gallery",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-name") ?? "Gallery",
        renderHTML: (attributes) => ({
          "data-name": String(attributes.name ?? "Gallery"),
        }),
      },
      data: {
        default: "{}",
        parseHTML: (el) => decodePayload((el as HTMLElement).getAttribute("data-payload")),
        renderHTML: (attributes) => ({
          "data-payload": encodeURIComponent(String(attributes.data ?? "{}")),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="blog-widget"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "blog-widget",
        class: "blog-widget-node my-4",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlogWidgetView);
  },
});
