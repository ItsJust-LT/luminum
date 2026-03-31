"use client";

import * as React from "react";
import type { BlogComponentMap } from "@itsjust-lt/blog-renderer";

function PreviewCallout(props: {
  variant?: string;
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <aside className="my-4 rounded-lg border border-border bg-muted/40 p-4 text-sm">
      {props.title ? <p className="mb-2 font-semibold">{props.title}</p> : null}
      <div className="text-muted-foreground">{props.children}</div>
    </aside>
  );
}

function PreviewImage(props: { src?: string; alt?: string; width?: number; height?: number; caption?: string }) {
  if (!props.src) return null;
  return (
    <figure className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.src}
        alt={props.alt ?? ""}
        width={props.width}
        height={props.height}
        className="max-h-96 max-w-full rounded-md object-contain"
      />
      {props.caption && <figcaption className="mt-1 text-xs text-muted-foreground">{props.caption}</figcaption>}
    </figure>
  );
}

function PreviewButton(props: { href?: string; label?: string; variant?: string }) {
  return (
    <a
      href={props.href || "#"}
      className="my-2 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
    >
      {props.label || "Link"}
    </a>
  );
}

function PreviewAccordion(props: { items?: unknown }) {
  const items = Array.isArray(props.items) ? props.items : [];
  return (
    <div className="my-4 space-y-2">
      {items.map((item: Record<string, unknown>, i: number) => (
        <details key={i} className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer font-medium text-sm">
            {String(item?.title ?? `Item ${i + 1}`)}
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">{String(item?.content ?? "")}</p>
        </details>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">[Accordion: no items]</p>}
    </div>
  );
}

function PreviewGallery(props: { images?: unknown; columns?: number }) {
  const images = Array.isArray(props.images) ? props.images : [];
  const cols = props.columns ?? 3;
  return (
    <div className="my-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {images.map((img: Record<string, unknown>, i: number) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={String(img?.src ?? "")}
          alt={String(img?.alt ?? "")}
          className="rounded-md object-cover w-full aspect-square"
        />
      ))}
      {images.length === 0 && <p className="text-sm text-muted-foreground col-span-full">[Gallery: no images]</p>}
    </div>
  );
}

function PreviewVideo(props: { src?: string; poster?: string; title?: string; width?: number; height?: number }) {
  if (!props.src) return <p className="my-4 text-sm text-muted-foreground">[Video: no src]</p>;
  return (
    <div className="my-4">
      {props.title && <p className="mb-1 text-sm font-medium">{props.title}</p>}
      <video
        src={props.src}
        poster={props.poster}
        controls
        width={props.width}
        height={props.height}
        className="max-w-full rounded-md"
      />
    </div>
  );
}

function PreviewCodeBlock(props: { code?: string; language?: string; filename?: string; showLineNumbers?: boolean }) {
  return (
    <div className="my-4">
      {props.filename && (
        <div className="rounded-t-md bg-muted px-3 py-1 text-xs font-mono text-muted-foreground border border-b-0 border-border">
          {props.filename}
        </div>
      )}
      <pre className={`rounded-${props.filename ? "b" : ""}md bg-muted p-3 text-xs font-mono overflow-x-auto border border-border`}>
        <code>{props.code ?? ""}</code>
      </pre>
      {props.language && <span className="text-[10px] text-muted-foreground">{props.language}</span>}
    </div>
  );
}

function PreviewAuthorCard(props: { name?: string; bio?: string; avatarSrc?: string; url?: string }) {
  return (
    <div className="my-4 flex items-center gap-3 rounded-lg border border-border p-4">
      {props.avatarSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.avatarSrc} alt={props.name ?? ""} className="h-12 w-12 rounded-full object-cover" />
      )}
      <div>
        <p className="font-semibold text-sm">{props.url ? <a href={props.url}>{props.name}</a> : props.name}</p>
        {props.bio && <p className="text-xs text-muted-foreground">{props.bio}</p>}
      </div>
    </div>
  );
}

export const dashboardBlogPreviewMap: BlogComponentMap = {
  Callout: PreviewCallout as React.ComponentType<Record<string, unknown>>,
  Image: PreviewImage as React.ComponentType<Record<string, unknown>>,
  Button: PreviewButton as React.ComponentType<Record<string, unknown>>,
  Accordion: PreviewAccordion as React.ComponentType<Record<string, unknown>>,
  Gallery: PreviewGallery as React.ComponentType<Record<string, unknown>>,
  Video: PreviewVideo as React.ComponentType<Record<string, unknown>>,
  CodeBlock: PreviewCodeBlock as React.ComponentType<Record<string, unknown>>,
  AuthorCard: PreviewAuthorCard as React.ComponentType<Record<string, unknown>>,
};
