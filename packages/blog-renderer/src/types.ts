export type MarkdownRenderBlock = { type: "markdown"; html: string };
export type ComponentRenderBlock = {
  type: "component";
  name: string;
  props: Record<string, unknown>;
  childrenBlocks: RenderSpecBlock[];
};
export type RenderSpecBlock = MarkdownRenderBlock | ComponentRenderBlock;
export type BlogRenderSpec = { version: 1; blocks: RenderSpecBlock[] };
