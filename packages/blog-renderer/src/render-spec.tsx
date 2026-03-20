import * as React from "react";
import type { BlogRenderSpec, RenderSpecBlock } from "./types.js";

export type BlogComponentMap = Record<string, React.ComponentType<Record<string, unknown>>>;

function renderBlock(
  block: RenderSpecBlock,
  componentMap: BlogComponentMap,
  keyPrefix: string
): React.ReactNode {
  if (block.type === "markdown") {
    return (
      <div
        key={keyPrefix}
        className="blog-render-spec-md prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }
  const Comp = componentMap[block.name];
  if (!Comp) {
    return (
      <div key={keyPrefix} className="rounded border border-destructive/40 p-2 text-sm text-destructive">
        Unknown blog component: <code>{block.name}</code>
      </div>
    );
  }
  const childNodes = block.childrenBlocks.map((ch, j) =>
    renderBlock(ch, componentMap, `${keyPrefix}-c${j}`)
  );
  const props = { ...block.props, key: keyPrefix };
  return React.createElement(Comp, props, ...(childNodes.length ? childNodes : []));
}

/**
 * Turn API `renderSpec` JSON into React nodes. Pass your own `componentMap` for allowlisted names.
 */
export function renderBlogSpec(
  spec: BlogRenderSpec | null | undefined,
  componentMap: BlogComponentMap
): React.ReactNode[] {
  if (!spec || spec.version !== 1 || !Array.isArray(spec.blocks)) return [];
  return spec.blocks.map((b, i) => renderBlock(b, componentMap, `blog-block-${i}`));
}
