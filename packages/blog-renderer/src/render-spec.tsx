import * as React from "react";
import type { BlogRenderSpec, RenderSpecBlock } from "./types.js";

export type BlogComponentMap = Record<string, React.ComponentType<Record<string, unknown>>>;

/** Typography / layout overrides for markdown and optional root wrapper. */
export type BlogRenderOptions = {
  /** Classes on each markdown HTML wrapper (default includes Tailwind Typography + image rounding). */
  markdownClassName?: string;
  /** Optional wrapper around all rendered blocks. */
  rootClassName?: string;
  /** Called when a component block name does not exist in the component map. */
  onUnknownComponent?: (name: string, props: Record<string, unknown>) => void;
  /**
   * Optional replacement renderer for unknown components.
   * If omitted, a safe default warning block is rendered.
   */
  unknownComponentFallback?: (
    name: string,
    props: Record<string, unknown>
  ) => React.ReactNode;
};

function renderBlock(
  block: RenderSpecBlock,
  componentMap: BlogComponentMap,
  keyPrefix: string,
  options?: BlogRenderOptions
): React.ReactNode {
  if (block.type === "markdown") {
    if (!block.html || !block.html.trim()) return null;
    const cls =
      options?.markdownClassName ??
      "blog-render-spec-md prose prose-neutral dark:prose-invert max-w-none prose-img:rounded-lg";
    return (
      <div
        key={keyPrefix}
        data-blog-block="markdown"
        className={cls}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }
  const Comp = componentMap[block.name];
  if (!Comp) {
    options?.onUnknownComponent?.(block.name, block.props);
    if (options?.unknownComponentFallback) {
      return (
        <React.Fragment key={keyPrefix}>
          {options.unknownComponentFallback(block.name, block.props)}
        </React.Fragment>
      );
    }
    return (
      <div key={keyPrefix} className="rounded border border-destructive/40 p-2 text-sm text-destructive">
        Unknown blog component: <code>{block.name}</code>
      </div>
    );
  }
  const childNodes = block.childrenBlocks.map((ch, j) =>
    renderBlock(ch, componentMap, `${keyPrefix}-c${j}`, options)
  );
  const props = { ...block.props, key: keyPrefix };
  return React.createElement(Comp, props, ...(childNodes.length ? childNodes : []));
}

/**
 * Turn API `renderSpec` JSON into React nodes. Pass your own `componentMap` for allowlisted names.
 */
export function renderBlogSpec(
  spec: BlogRenderSpec | null | undefined,
  componentMap: BlogComponentMap,
  options?: BlogRenderOptions
): React.ReactNode[] {
  if (!spec || spec.version !== 1 || !Array.isArray(spec.blocks)) return [];
  const inner = spec.blocks.map((b, i) =>
    renderBlock(b, componentMap, `blog-block-${i}`, options)
  );
  if (options?.rootClassName) {
    return [
      <div key="blog-spec-root" className={options.rootClassName}>
        {inner}
      </div>,
    ];
  }
  return inner;
}
