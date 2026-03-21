"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { dashboardBlogAssetUrlFromKey, getHostnameLabelForSiteBase } from "@/lib/blog-public-url";
import { renderBlogSpec, type BlogRenderSpec } from "@luminum/blog-renderer";
import { dashboardBlogPreviewMap } from "./dashboard-blog-preview-map";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ArrowLeft,
  Save,
  Send,
  ExternalLink,
  ImagePlus,
  Type,
  Heading1,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  Minus,
  MoreHorizontal,
  Trash2,
  EyeOff,
  Sparkles,
  Paperclip,
  PenLine,
  Eye,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const FONT_CLASSES = ["text-sm", "text-base", "text-lg", "text-xl"] as const;

type EditorMode = "write" | "preview";

export function BlogEditor(props: {
  organizationId: string;
  orgSlug: string;
  postId: string;
  /** Root URL of the public marketing site (org metadata: publicBaseUrl / baseUrl / siteUrl). */
  publicSiteBaseUrl?: string | null;
}) {
  const router = useRouter();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const inlineImageInputRef = React.useRef<HTMLInputElement>(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [unpublishing, setUnpublishing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [previewOpening, setPreviewOpening] = React.useState(false);
  const [autoSaveState, setAutoSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editorMode, setEditorMode] = React.useState<EditorMode>("write");
  const [liveSpec, setLiveSpec] = React.useState<BlogRenderSpec | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [content, setContent] = React.useState("");
  const [coverKey, setCoverKey] = React.useState("");
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");
  const [status, setStatus] = React.useState<string>("draft");
  const [allowlist, setAllowlist] = React.useState<AllowComponent[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [categoryInput, setCategoryInput] = React.useState("");
  const [fontClass, setFontClass] = React.useState<(typeof FONT_CLASSES)[number]>("text-sm");
  const [dirty, setDirty] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [imageUrlDialogOpen, setImageUrlDialogOpen] = React.useState(false);
  const [imageUrlDraft, setImageUrlDraft] = React.useState("");
  const [imageAltDraft, setImageAltDraft] = React.useState("Image");

  const markDirty = React.useCallback(() => setDirty(true), []);

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
        setContent(String(p.content_markdown ?? ""));
        setCoverKey(String(p.cover_image_key ?? ""));
        setSeoTitle(String(p.seo_title ?? ""));
        setSeoDescription(String(p.seo_description ?? ""));
        setStatus(String(p.status ?? "draft"));
        setCategories(Array.isArray(p.categories) ? (p.categories as string[]) : []);
        setAllowlist(compRes.components ?? []);
        setDirty(false);
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

  const persist = React.useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      const silent = opts?.silent;
      if (!silent) setSaving(true);
      else setAutoSaveState("saving");
      try {
        const out = (await api.blog.updatePost(props.postId, {
          title,
          slug,
          content_markdown: content,
          cover_image_key: coverKey,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
          categories,
        })) as { post?: Record<string, unknown> };
        if (!silent) toast.success("Saved");
        setAutoSaveState("saved");
        setDirty(false);
        const p = out.post;
        if (p) setStatus(String(p.status ?? "draft"));
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Save failed";
        if (!silent) toast.error(msg);
        setAutoSaveState("error");
        return false;
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [props.postId, title, slug, content, coverKey, seoTitle, seoDescription, categories]
  );

  React.useEffect(() => {
    if (loading || !dirty) return;
    const t = window.setTimeout(() => {
      void persist({ silent: true });
    }, 1800);
    return () => window.clearTimeout(t);
  }, [loading, dirty, title, slug, content, coverKey, seoTitle, seoDescription, categories, persist]);

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

  React.useEffect(() => {
    if (loading || editorMode !== "preview") return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 320);
    return () => window.clearTimeout(t);
  }, [loading, editorMode, content, refreshPreview]);

  const openSitePreview = async () => {
    if (!slug.trim()) {
      toast.error("Add a URL slug before opening site preview.");
      return;
    }
    const base = props.publicSiteBaseUrl?.trim();
    if (!base) {
      toast.error("Add your website address in Organization settings.");
      return;
    }
    setPreviewOpening(true);
    try {
      if (dirty) {
        const saved = await persist({ silent: true });
        if (!saved) return;
      }
      const { token } = await api.blog.mintPreviewToken(props.postId);
      const url = new URL(`${base.replace(/\/$/, "")}/blog/${encodeURIComponent(slug)}`);
      url.searchParams.set("previewToken", token);
      url.searchParams.set("organizationId", props.organizationId);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not open site preview");
    } finally {
      setPreviewOpening(false);
    }
  };

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    markDirty();
    if (!el) {
      setContent((c) => (c ? `${c}\n\n${snippet}` : snippet));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = content;
    const next = v.slice(0, start) + snippet + v.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

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
      markDirty();
      toast.success("Cover set — auto-saved shortly");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
    e.target.value = "";
  };

  const onInlineImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const url = dashboardBlogAssetUrlFromKey(res.key);
      insertAtCursor(`![${file.name.replace(/[\[\]]/g, "")}](${url})`);
      toast.success("Image inserted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
    e.target.value = "";
  };

  const insertMarkdownImageFromUrl = () => {
    const url = imageUrlDraft.trim();
    if (!url) {
      toast.error("Enter an image URL");
      return;
    }
    if (!/^(https?:\/\/|\/)/i.test(url)) {
      toast.error("Use an https URL or a path starting with /");
      return;
    }
    const alt = imageAltDraft.trim() || "Image";
    const altEscaped = alt.replace(/[\[\]]/g, "");
    insertAtCursor(`![${altEscaped}](${url})`);
    setImageUrlDialogOpen(false);
    setImageUrlDraft("");
    toast.success("Image inserted");
  };

  const insertComponentSnippet = (componentName?: string) => {
    const name = componentName ?? allowlist[0]?.name ?? "Callout";
    const def = allowlist.find((c) => c.name === name);
    if (!def) return;
    markDirty();
    const lines: string[] = [];
    switch (def.name) {
      case "Callout":
        lines.push(`<Callout variant="info" title="Title">`, ``, `Your markdown here.`, ``, `</Callout>`);
        break;
      case "Image":
        lines.push(
          `<Image src="${dashboardBlogAssetUrlFromKey("YOUR_KEY_AFTER_UPLOAD")}" alt="Description" width=800 height=600 />`
        );
        toast.message("Upload an image below, then paste its URL into src=");
        break;
      case "Button":
        lines.push(`<Button href="https://example.com" label="Click me" />`);
        break;
      case "Accordion":
        lines.push(
          `<Accordion items=[{"title":"Section 1","content":"Content here"},{"title":"Section 2","content":"More content"}] />`
        );
        break;
      case "Gallery":
        lines.push(
          `<Gallery images=[{"src":"URL1","alt":"1"},{"src":"URL2","alt":"2"}] columns=3 />`
        );
        break;
      case "Video":
        lines.push(`<Video src="VIDEO_URL" title="Video title" />`);
        break;
      case "CodeBlock":
        lines.push(`<CodeBlock language="javascript" code="console.log('Hello');" showLineNumbers=true />`);
        break;
      case "AuthorCard":
        lines.push(`<AuthorCard name="Author" bio="Short bio" />`);
        break;
      default:
        lines.push(`<${def.name} />`);
    }
    insertAtCursor(lines.join("\n"));
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const saved = await persist({ silent: true });
      if (!saved) return;
      await api.blog.publishPost(props.postId);
      setStatus("published");
      toast.success("Published");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    setUnpublishing(true);
    try {
      await api.blog.updatePost(props.postId, { status: "draft" });
      setStatus("draft");
      toast.success("Moved to drafts (unpublished)");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Unpublish failed");
    } finally {
      setUnpublishing(false);
    }
  };

  const removePost = async () => {
    setDeleting(true);
    try {
      await api.blog.deletePost(props.postId);
      toast.success("Post deleted");
      router.push(`/${props.orgSlug}/blogs`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background">
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-4 md:px-6">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 md:p-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="min-h-[max(24rem,calc(100dvh-19rem))] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const previewNodes =
    liveSpec != null ? renderBlogSpec(liveSpec, dashboardBlogPreviewMap) : [];

  const siteHostname = getHostnameLabelForSiteBase(props.publicSiteBaseUrl ?? null);
  const hasLiveSite = Boolean(props.publicSiteBaseUrl?.trim());

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="sticky top-0 z-20 flex shrink-0 flex-col gap-4 border-b border-border/50 bg-background/90 px-4 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-6"
      >
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0 rounded-lg" asChild>
            <Link href={`/${props.orgSlug}/blogs`} aria-label="Back to posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Edit post</h1>
            {title.trim() ? (
              <p className="mt-0.5 truncate text-sm font-medium text-foreground/90" title={title}>
                {title}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={status === "published" ? "default" : "secondary"}>{status}</Badge>
              <AnimatePresence mode="wait">
                {autoSaveState === "saving" && (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving draft…
                  </motion.span>
                )}
                {autoSaveState === "saved" && !dirty && (
                  <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-600">
                    Draft saved
                  </motion.span>
                )}
                {autoSaveState === "error" && (
                  <motion.span key="err" className="text-destructive">
                    Auto-save failed — use Save
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={previewOpening || saving || publishing}
            onClick={() => void openSitePreview()}
            className="gap-1.5"
            title={
              !hasLiveSite
                ? "Add your website in Organization settings"
                : !slug.trim()
                  ? "Add a URL slug first"
                  : `Open draft preview on ${siteHostname || "your site"}`
            }
          >
            {previewOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            View on site
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => void persist()}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save now
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={publishing || !coverKey.trim()}
            onClick={() => void publish()}
            className="gap-1.5"
            title={!coverKey.trim() ? "Add a cover image in the Markdown section before publishing" : undefined}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publish
          </Button>
          {status === "published" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={unpublishing}
              onClick={() => void unpublish()}
              className="gap-1.5"
            >
              {unpublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
              Unpublish
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Danger</DropdownMenuLabel>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 md:px-8"
      >
          <Card className="shrink-0 border-border/60 shadow-sm sm:rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Post details</CardTitle>
              <CardDescription>Title, URL slug, and categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
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
                        className="ml-0.5 rounded-sm text-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                          setCategories((prev) => prev.filter((_, j) => j !== i));
                          markDirty();
                        }}
                        aria-label={`Remove category ${cat}`}
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
                        markDirty();
                      }
                      setCategoryInput("");
                    }}
                  >
                    <Input
                      className="h-8 w-36 text-xs"
                      placeholder="Add…"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                    />
                    <Button type="submit" variant="secondary" size="sm" className="h-8 px-2 text-xs">
                      Add
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 shadow-md sm:rounded-2xl">
            <CardHeader className="shrink-0 space-y-0 pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg">Content</CardTitle>
                  <CardDescription>Write markdown — drafts save automatically</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-1 shadow-inner"
                    role="tablist"
                    aria-label="Editor mode"
                  >
                    <Button
                      type="button"
                      variant={editorMode === "write" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 gap-1.5 px-3"
                      onClick={() => setEditorMode("write")}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Write
                    </Button>
                    <Button
                      type="button"
                      variant={editorMode === "preview" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 gap-1.5 px-3"
                      onClick={() => setEditorMode("preview")}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                  </div>
                  {editorMode === "write" ? (
                    <Select value={fontClass} onValueChange={(v) => setFontClass(v as (typeof FONT_CLASSES)[number])}>
                      <SelectTrigger className="h-8 w-[132px] text-xs" size="sm">
                        <Type className="mr-1 h-3.5 w-3.5" />
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-sm">Small</SelectItem>
                        <SelectItem value="text-base">Medium</SelectItem>
                        <SelectItem value="text-lg">Large</SelectItem>
                        <SelectItem value="text-xl">Extra large</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0 sm:p-6 sm:pt-0">
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onCoverFile(e)} />
              <input ref={inlineImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onInlineImage(e)} />

              {editorMode === "write" ? (
              <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      title="Insert heading"
                    >
                      <Heading1 className="h-3.5 w-3.5" />
                      Headings
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => insertAtCursor("# ")}>H1</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertAtCursor("## ")}>H2</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertAtCursor("### ")}>H3</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("**bold**")}
                  title="Bold"
                >
                  <span className="text-xs font-bold">B</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("*italic*")}
                  title="Italic"
                >
                  <span className="text-xs italic">I</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("[label](url)")}
                  title="Insert link"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("\n- ")}
                  title="Bullet list"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("\n1. ")}
                  title="Numbered list"
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("\n> ")}
                  title="Blockquote"
                >
                  <Quote className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("\n```\n\n```\n")}
                  title="Code block"
                >
                  <Code className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => insertAtCursor("\n---\n")}
                  title="Horizontal rule"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Separator orientation="vertical" className="mx-0.5 h-6 self-center" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => coverInputRef.current?.click()}
                  title="Upload cover image"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Cover
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      title="Insert image — upload or paste URL"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Image
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem
                      onClick={() => inlineImageInputRef.current?.click()}
                      className="cursor-pointer"
                    >
                      Upload from device…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setImageUrlDialogOpen(true)}
                      className="cursor-pointer"
                    >
                      Insert image URL…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      title="Insert allowlisted component"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Block
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Pick component</DropdownMenuLabel>
                    {allowlist.map((c) => (
                      <DropdownMenuItem key={c.name} onClick={() => insertComponentSnippet(c.name)}>
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              ) : null}

              <div className="flex flex-wrap items-start gap-4 rounded-lg border border-dashed p-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Cover (required to publish)</p>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                      Upload
                    </Button>
                    {coverKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dashboardBlogAssetUrlFromKey(coverKey)}
                        alt="Cover"
                        className="h-20 w-32 rounded-md border object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No cover</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/25 shadow-inner ring-1 ring-border/30">
                <AnimatePresence mode="wait">
                  {editorMode === "write" ? (
                    <motion.div
                      key="write"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="flex min-h-[max(24rem,calc(100dvh-19rem))] flex-1 flex-col"
                    >
                      <Textarea
                        ref={textareaRef}
                        spellCheck
                        rows={32}
                        className={cn(
                          "min-h-[max(24rem,calc(100dvh-19rem))] w-full flex-1 resize-y border-0 bg-background/80 px-4 py-4 font-mono leading-relaxed shadow-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-background/40",
                          fontClass
                        )}
                        value={content}
                        onChange={(e) => {
                          setContent(e.target.value);
                          markDirty();
                        }}
                        placeholder="Write markdown. Use allowlisted components like <Callout … />"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="min-h-[max(24rem,calc(100dvh-19rem))] flex-1"
                    >
                      <ScrollArea className="h-[max(24rem,calc(100dvh-19rem))]">
                        <div
                          className={cn(
                            "prose prose-sm md:prose-base max-w-none p-4 md:p-6",
                            "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
                            "prose-p:leading-[1.7] prose-p:text-foreground prose-p:my-3",
                            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
                            "prose-strong:font-semibold prose-strong:text-foreground",
                            "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
                            "prose-pre:bg-muted prose-pre:border prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-4",
                            "prose-img:rounded-xl prose-img:border prose-img:shadow-sm prose-img:my-4",
                            "prose-hr:border-border prose-hr:my-6"
                          )}
                        >
                          {previewLoading ? (
                            <div className="space-y-4 py-2">
                              <Skeleton className="h-9 w-2/3" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                              <Skeleton className="h-4 w-4/5" />
                              <Skeleton className="h-32 w-full rounded-lg" />
                            </div>
                          ) : previewNodes.length > 0 ? (
                            previewNodes
                          ) : (
                            <p className="text-sm text-muted-foreground">Nothing to preview yet — add some markdown in Write mode.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <Card className="shrink-0 border-border/60 bg-muted/15 shadow-sm sm:rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Search appearance</CardTitle>
              <CardDescription>Optional — how this post may look in Google and social shares</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">Title override</Label>
                <Input
                  id="seo_title"
                  value={seoTitle}
                  onChange={(e) => {
                    setSeoTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="Defaults to post title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description">Meta description</Label>
                <Textarea
                  id="seo_description"
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => {
                    setSeoDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Short description for search results"
                />
              </div>
            </CardContent>
          </Card>
      </motion.div>

      <Dialog
        open={imageUrlDialogOpen}
        onOpenChange={(open) => {
          setImageUrlDialogOpen(open);
          if (!open) setImageUrlDraft("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert image from URL</DialogTitle>
            <DialogDescription>
              Paste a full <code className="rounded bg-muted px-1">https://…</code> link to any image, or a site path
              starting with <code className="rounded bg-muted px-1">/</code>. For files in your org library, prefer{" "}
              <strong>Upload from device</strong> in the Image menu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="blog_img_alt">Alt text</Label>
              <Input
                id="blog_img_alt"
                value={imageAltDraft}
                onChange={(e) => setImageAltDraft(e.target.value)}
                placeholder="Describe the image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog_img_url">Image URL</Label>
              <Input
                id="blog_img_url"
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
                placeholder="https://… or /path/to/image.png"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    insertMarkdownImageFromUrl();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setImageUrlDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => insertMarkdownImageFromUrl()}>
              Insert markdown
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the post. To hide it from the site without deleting, use Unpublish instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void removePost()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
