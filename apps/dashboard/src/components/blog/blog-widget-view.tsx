"use client";

import * as React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultWidgetData } from "@/lib/blog-widget-serializer";
import { useBlogAssetUpload } from "./blog-upload-context";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Trash2, Upload } from "lucide-react";

function parseData(raw: string): Record<string, unknown> {
  try {
    const o = JSON.parse(raw || "{}");
    return typeof o === "object" && o && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

type GalleryImg = { src: string; alt: string };

function WidgetChrome({
  title,
  selected,
  children,
  onRemove,
}: {
  title: string;
  selected: boolean;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br from-primary/[0.06] to-muted/40 p-3 shadow-sm ring-offset-background transition-shadow",
        selected ? "border-primary/50 ring-2 ring-primary/40" : "border-border/70"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          {title}
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onRemove}>
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
      {children}
    </div>
  );
}

export function BlogWidgetView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected } = props;
  const name = String(node.attrs.name ?? "Gallery");
  const data = parseData(String(node.attrs.data ?? "{}"));
  const upload = useBlogAssetUpload();
  const uploadTarget = React.useRef<{ kind: string; index?: number } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const setData = React.useCallback(
    (patch: Record<string, unknown>) => {
      updateAttributes({ data: JSON.stringify({ ...data, ...patch }) });
    },
    [data, updateAttributes]
  );

  const replaceData = React.useCallback(
    (next: Record<string, unknown>) => {
      updateAttributes({ data: JSON.stringify(next) });
    },
    [updateAttributes]
  );

  const resetDefaults = React.useCallback(() => {
    replaceData(defaultWidgetData(name));
  }, [name, replaceData]);

  const triggerUpload = (kind: "gallery" | "image" | "author" | "video", index?: number) => {
    if (!upload) return;
    uploadTarget.current = { kind, index };
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !upload || !uploadTarget.current) {
      e.target.value = "";
      return;
    }
    const t = uploadTarget.current;
    try {
      const url = await upload(file);
      if (t.kind === "gallery" && typeof t.index === "number") {
        const images = [...((data.images as GalleryImg[]) ?? [])];
        if (images[t.index]) {
          images[t.index] = { ...images[t.index]!, src: url, alt: images[t.index]!.alt || file.name };
          setData({ images });
        }
      } else if (t.kind === "image") {
        setData({ src: url, alt: String(data.alt ?? file.name) });
      } else if (t.kind === "author") {
        setData({ avatarSrc: url });
      } else if (t.kind === "video") {
        setData({ poster: url });
      }
    } catch {
      /* toast handled in parent ideally */
    }
    uploadTarget.current = null;
    e.target.value = "";
  };

  const renderBody = () => {
    switch (name) {
      case "Gallery": {
        const images = ((data.images as GalleryImg[]) ?? [{ src: "", alt: "" }]).map((i) => ({
          src: String(i?.src ?? ""),
          alt: String(i?.alt ?? ""),
        }));
        const columns = Math.min(6, Math.max(1, Number(data.columns ?? 3)));
        return (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Columns</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  className="h-8 w-20 text-sm"
                  value={columns}
                  onChange={(e) => setData({ columns: Number(e.target.value) || 1 })}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8"
                onClick={() => setData({ images: [...images, { src: "", alt: "" }] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add image
              </Button>
            </div>
            <div className="space-y-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/60 p-2 sm:flex-row sm:items-start"
                >
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Image URL</Label>
                      <Input
                        className="h-8 text-sm"
                        value={img.src}
                        placeholder="https://…"
                        onChange={(e) => {
                          const next = [...images];
                          next[idx] = { ...next[idx]!, src: e.target.value };
                          setData({ images: next });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alt text</Label>
                      <Input
                        className="h-8 text-sm"
                        value={img.alt}
                        placeholder="Description"
                        onChange={(e) => {
                          const next = [...images];
                          next[idx] = { ...next[idx]!, alt: e.target.value };
                          setData({ images: next });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {upload ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => triggerUpload("gallery", idx)}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        Upload
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive"
                      disabled={images.length <= 1}
                      onClick={() => {
                        const next = images.filter((_, i) => i !== idx);
                        setData({ images: next.length ? next : [{ src: "", alt: "" }] });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }
      case "Accordion": {
        type Item = { title: string; content: string };
        const items = ((data.items as Item[]) ?? []).map((it) => ({
          title: String(it?.title ?? ""),
          content: String(it?.content ?? ""),
        }));
        const safe = items.length ? items : [{ title: "Section", content: "Content" }];
        return (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mb-3 h-8"
              onClick={() => setData({ items: [...safe, { title: "New section", content: "" }] })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add section
            </Button>
            <div className="space-y-3">
              {safe.map((it, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border border-border/50 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium">Section {idx + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive"
                      disabled={safe.length <= 1}
                      onClick={() => {
                        const next = safe.filter((_, i) => i !== idx);
                        setData({ items: next.length ? next : [{ title: "Section", content: "" }] });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  <Input
                    className="h-8 text-sm"
                    value={it.title}
                    placeholder="Title"
                    onChange={(e) => {
                      const next = [...safe];
                      next[idx] = { ...next[idx]!, title: e.target.value };
                      setData({ items: next });
                    }}
                  />
                  <Textarea
                    className="min-h-[72px] text-sm"
                    value={it.content}
                    placeholder="Content (markdown/plain)"
                    onChange={(e) => {
                      const next = [...safe];
                      next[idx] = { ...next[idx]!, content: e.target.value };
                      setData({ items: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        );
      }
      case "Callout": {
        const variant = String(data.variant ?? "info");
        const title = String(data.title ?? "");
        const body = String(data.body ?? "");
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Variant</Label>
                <Select value={variant} onValueChange={(v) => setData({ variant: v })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["info", "warning", "error", "success"].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input
                  className="h-8 text-sm"
                  value={title}
                  onChange={(e) => setData({ title: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body</Label>
              <Textarea
                className="min-h-[100px] text-sm"
                value={body}
                onChange={(e) => setData({ body: e.target.value })}
              />
            </div>
          </div>
        );
      }
      case "Button": {
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Href</Label>
              <Input
                className="h-8 text-sm"
                value={String(data.href ?? "")}
                onChange={(e) => setData({ href: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                className="h-8 text-sm"
                value={String(data.label ?? "")}
                onChange={(e) => setData({ label: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Variant</Label>
              <Select
                value={String(data.variant ?? "default")}
                onValueChange={(v) => setData({ variant: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["default", "outline", "secondary", "ghost", "link"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }
      case "Video": {
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Video URL (src)</Label>
              <Input
                className="h-8 text-sm"
                value={String(data.src ?? "")}
                onChange={(e) => setData({ src: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Title</Label>
              <Input
                className="h-8 text-sm"
                value={String(data.title ?? "")}
                onChange={(e) => setData({ title: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Poster URL</Label>
              <div className="flex gap-2">
                <Input
                  className="h-8 flex-1 text-sm"
                  value={String(data.poster ?? "")}
                  onChange={(e) => setData({ poster: e.target.value })}
                />
                {upload ? (
                  <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => triggerUpload("video")}>
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                className="h-8 text-sm"
                value={data.width != null ? String(data.width) : ""}
                placeholder="optional"
                onChange={(e) =>
                  setData({ width: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                className="h-8 text-sm"
                value={data.height != null ? String(data.height) : ""}
                placeholder="optional"
                onChange={(e) =>
                  setData({ height: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
          </div>
        );
      }
      case "CodeBlock": {
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Language</Label>
                <Input
                  className="h-8 font-mono text-sm"
                  value={String(data.language ?? "text")}
                  onChange={(e) => setData({ language: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Filename</Label>
                <Input
                  className="h-8 font-mono text-sm"
                  value={String(data.filename ?? "")}
                  placeholder="optional"
                  onChange={(e) => setData({ filename: e.target.value || undefined })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cb-lines"
                checked={data.showLineNumbers !== false}
                onCheckedChange={(c) => setData({ showLineNumbers: c === true })}
              />
              <Label htmlFor="cb-lines" className="text-sm font-normal">
                Show line numbers
              </Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Code</Label>
              <Textarea
                className="min-h-[160px] font-mono text-xs leading-relaxed"
                spellCheck={false}
                value={String(data.code ?? "")}
                onChange={(e) => setData({ code: e.target.value })}
              />
            </div>
          </div>
        );
      }
      case "AuthorCard": {
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                className="h-8 text-sm"
                value={String(data.name ?? "")}
                onChange={(e) => setData({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Bio</Label>
              <Textarea
                className="min-h-[72px] text-sm"
                value={String(data.bio ?? "")}
                onChange={(e) => setData({ bio: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Avatar URL</Label>
              <div className="flex gap-2">
                <Input
                  className="h-8 flex-1 text-sm"
                  value={String(data.avatarSrc ?? "")}
                  onChange={(e) => setData({ avatarSrc: e.target.value })}
                />
                {upload ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => triggerUpload("author")}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Profile URL</Label>
              <Input
                className="h-8 text-sm"
                value={String(data.url ?? "")}
                onChange={(e) => setData({ url: e.target.value })}
              />
            </div>
          </div>
        );
      }
      case "Image": {
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  className="h-8 flex-1 text-sm"
                  value={String(data.src ?? "")}
                  onChange={(e) => setData({ src: e.target.value })}
                />
                {upload ? (
                  <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => triggerUpload("image")}>
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Alt</Label>
                <Input
                  className="h-8 text-sm"
                  value={String(data.alt ?? "")}
                  onChange={(e) => setData({ alt: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Caption</Label>
                <Input
                  className="h-8 text-sm"
                  value={String(data.caption ?? "")}
                  onChange={(e) => setData({ caption: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={String(data.width ?? 800)}
                  onChange={(e) => setData({ width: Number(e.target.value) || 800 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={String(data.height ?? 600)}
                  onChange={(e) => setData({ height: Number(e.target.value) || 600 })}
                />
              </div>
            </div>
          </div>
        );
      }
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Unknown block <strong>{name}</strong>.{" "}
            <button type="button" className="text-primary underline" onClick={resetDefaults}>
              Reset fields
            </button>
          </p>
        );
    }
  };

  return (
    <NodeViewWrapper className="blog-widget-root">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />
      <WidgetChrome title={name} selected={selected} onRemove={() => deleteNode()}>
        {renderBody()}
      </WidgetChrome>
    </NodeViewWrapper>
  );
}
