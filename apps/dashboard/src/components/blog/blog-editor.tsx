"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { publicBlogAssetUrlFromKey } from "@/lib/blog-public-url";
import { renderBlogSpec, type BlogRenderSpec } from "@luminum/blog-renderer";
import { dashboardBlogPreviewMap } from "./dashboard-blog-preview-map";
import { Loader2 } from "lucide-react";

type AllowComponent = { name: string; props: Record<string, { type: string; required?: boolean }> };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function BlogEditor(props: {
  organizationId: string;
  orgSlug: string;
  postId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [content, setContent] = React.useState("");
  const [coverKey, setCoverKey] = React.useState("");
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");
  const [status, setStatus] = React.useState<string>("draft");
  const [storedSpec, setStoredSpec] = React.useState<BlogRenderSpec | null>(null);
  const [liveSpec, setLiveSpec] = React.useState<BlogRenderSpec | null>(null);
  const [allowlist, setAllowlist] = React.useState<AllowComponent[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [categoryInput, setCategoryInput] = React.useState("");
  const [insertName, setInsertName] = React.useState<string>("Callout");
  const [tab, setTab] = React.useState("edit");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [postRes, compRes] = await Promise.all([
          api.blog.getPostById(props.postId) as Promise<{ post: Record<string, unknown> }>,
          api.blog.getComponents() as Promise<{ components: AllowComponent[] }>,
        ]);
        if (cancelled) return;
        const p = postRes.post;
        setTitle(String(p.title ?? ""));
        setSlug(String(p.slug ?? ""));
        setSummary(String(p.summary ?? ""));
        setContent(String(p.content_markdown ?? ""));
        setCoverKey(String(p.cover_image_key ?? ""));
        setSeoTitle(String(p.seo_title ?? ""));
        setSeoDescription(String(p.seo_description ?? ""));
        setStatus(String(p.status ?? "draft"));
        setCategories(Array.isArray(p.categories) ? (p.categories as string[]) : []);
        const spec = p.content_render_spec as BlogRenderSpec | null;
        setStoredSpec(spec && typeof spec === "object" ? spec : null);
        setAllowlist(compRes.components ?? []);
        if (compRes.components?.[0]?.name) setInsertName(compRes.components[0].name);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load post");
        router.push(`/${props.orgSlug}/blogs`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.postId, props.orgSlug, router]);

  const refreshPreview = React.useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = (await api.blog.previewSpec(props.postId, {
        content_markdown: content,
      })) as { renderSpec: BlogRenderSpec };
      setLiveSpec(res.renderSpec);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
      setLiveSpec(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [props.postId, content]);

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      const res = (await api.blog.upload({
        organizationId: props.organizationId,
        postId: props.postId,
        fileBase64: b64,
        contentType: file.type || "application/octet-stream",
        originalFilename: file.name,
      })) as { key: string };
      setCoverKey(res.key);
      toast.success("Cover uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const insertAssetUrl = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      const res = (await api.blog.upload({
        organizationId: props.organizationId,
        postId: props.postId,
        fileBase64: b64,
        contentType: file.type || "application/octet-stream",
        originalFilename: file.name,
      })) as { url: string };
      const insert = `![${file.name}](${res.url})`;
      setContent((c) => (c ? `${c}\n\n${insert}` : insert));
      toast.success("Image URL inserted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const insertComponentSnippet = () => {
    const def = allowlist.find((c) => c.name === insertName);
    if (!def) return;
    const lines: string[] = [];
    switch (def.name) {
      case "Callout":
        lines.push(`<Callout variant="info" title="Title">`, ``, `Your markdown here.`, ``, `</Callout>`);
        break;
      case "Image":
        lines.push(`<Image src="PASTE_PUBLIC_BLOG_ASSET_URL_HERE" alt="Description" width=800 height=600 />`);
        toast.message("Replace PASTE_PUBLIC_BLOG_ASSET_URL_HERE with the URL from in-post image upload");
        break;
      case "Button":
        lines.push(`<Button href="https://example.com" label="Click me" />`);
        break;
      case "Accordion":
        lines.push(`<Accordion items=[{"title":"Section 1","content":"Content here"},{"title":"Section 2","content":"More content"}] />`);
        break;
      case "Gallery":
        lines.push(`<Gallery images=[{"src":"PASTE_URL_1","alt":"Image 1"},{"src":"PASTE_URL_2","alt":"Image 2"}] columns=3 />`);
        toast.message("Replace PASTE_URL values with blog asset URLs");
        break;
      case "Video":
        lines.push(`<Video src="PASTE_VIDEO_URL_HERE" title="Video title" />`);
        break;
      case "CodeBlock":
        lines.push(`<CodeBlock language="javascript" code="console.log('Hello world');" showLineNumbers=true />`);
        break;
      case "AuthorCard":
        lines.push(`<AuthorCard name="Author Name" bio="Short bio here" />`);
        break;
      default:
        lines.push(`<${def.name} />`);
    }
    const snip = lines.join("\n");
    setContent((c) => (c ? `${c}\n\n${snip}` : snip));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.blog.updatePost(props.postId, {
        title,
        slug,
        summary,
        content_markdown: content,
        cover_image_key: coverKey,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        categories,
      });
      toast.success("Saved");
      const refreshed = (await api.blog.getPostById(props.postId)) as { post: Record<string, unknown> };
      const spec = refreshed.post.content_render_spec as BlogRenderSpec | null;
      setStoredSpec(spec && typeof spec === "object" ? spec : null);
      setStatus(String(refreshed.post.status ?? "draft"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await api.blog.updatePost(props.postId, {
        title,
        slug,
        summary,
        content_markdown: content,
        cover_image_key: coverKey,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        categories,
      });
      const res = (await api.blog.publishPost(props.postId)) as {
        post: Record<string, unknown>;
        renderSpec: BlogRenderSpec;
      };
      setStoredSpec(res.renderSpec);
      setStatus("published");
      toast.success("Published");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading editor…
      </div>
    );
  }

  const previewNodes =
    liveSpec != null
      ? renderBlogSpec(liveSpec, dashboardBlogPreviewMap)
      : storedSpec != null
        ? renderBlogSpec(storedSpec, dashboardBlogPreviewMap)
        : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit blog post</h1>
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium text-foreground">{status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => router.push(`/${props.orgSlug}/blogs`)}>
            Back
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
          </Button>
          <Button type="button" disabled={publishing || !coverKey.trim()} onClick={() => void publish()}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {cat}
              <button
                type="button"
                className="ml-0.5 text-primary/60 hover:text-primary"
                onClick={() => setCategories((prev) => prev.filter((_, j) => j !== i))}
              >
                &times;
              </button>
            </span>
          ))}
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const v = categoryInput.trim();
              if (v && !categories.includes(v)) {
                setCategories((prev) => [...prev, v]);
              }
              setCategoryInput("");
            }}
          >
            <Input
              className="h-7 w-40 text-xs"
              placeholder="Add category…"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
            />
            <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Add
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cover image (required to publish)</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input type="file" accept="image/*" onChange={(e) => void onCoverFile(e)} className="max-w-xs" />
          {coverKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicBlogAssetUrlFromKey(coverKey)}
              alt="Cover"
              className="h-20 w-32 rounded-md border object-cover"
            />
          ) : (
            <span className="text-sm text-muted-foreground">No cover yet</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>In-post image (upload inserts markdown URL)</Label>
        <Input type="file" accept="image/*" onChange={(e) => void insertAssetUrl(e)} className="max-w-xs" />
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>Insert component</Label>
          <Select value={insertName} onValueChange={setInsertName}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Component" />
            </SelectTrigger>
            <SelectContent>
              {allowlist.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" onClick={insertComponentSnippet}>
          Insert snippet
        </Button>
        {allowlist.find((c) => c.name === insertName) ? (
          <p className="w-full text-xs text-muted-foreground">
            Props:{" "}
            {Object.entries(allowlist.find((c) => c.name === insertName)!.props).map(([k, v]) => (
              <span key={k} className="mr-2">
                {k}
                {v.required ? "*" : ""} ({v.type})
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          if (v === "preview") void refreshPreview();
        }}
      >
        <TabsList>
          <TabsTrigger value="edit">Markdown</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="mt-4">
          <Textarea
            rows={18}
            className="font-mono text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write markdown. Use allowlisted components like &lt;Callout variant=&quot;info&quot; title=&quot;Tip&quot;&gt;…&lt;/Callout&gt;"
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-4 min-h-[200px] rounded-lg border p-4">
          {previewLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Building preview…
            </div>
          ) : previewNodes.length ? (
            <div className="space-y-4">{previewNodes}</div>
          ) : (
            <p className="text-sm text-muted-foreground">Open Preview again after fixing validation errors.</p>
          )}
        </TabsContent>
        <TabsContent value="seo" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seo_title">SEO title</Label>
            <Input id="seo_title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo_description">SEO description</Label>
            <Textarea
              id="seo_description"
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1">publicBaseUrl</code> in organization metadata (Settings) for
            correct canonical URLs on the public site.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
