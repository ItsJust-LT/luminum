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
import { slugifyFromTitle } from "@/lib/blog-slug";
import {
  quickLintBlogMarkdown,
  toDatetimeLocalValue,
} from "@/lib/blog-markdown-lint";
import { BlogRichEditor, type BlogRichEditorHandle } from "./blog-rich-editor";
import { BlogAssetUploadContext } from "./blog-upload-context";
import { BlogCategoryCombobox } from "./blog-category-combobox";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  Save,
  Send,
  ExternalLink,
  ImagePlus,
  MoreHorizontal,
  Trash2,
  EyeOff,
  Sparkles,
  Paperclip,
  Eye,
  ChevronDown,
  FileCode2,
  Undo2,
  Redo2,
  Search,
  CalendarClock,
} from "lucide-react";

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
  /** Root URL of the public marketing site (org metadata: publicBaseUrl / baseUrl / siteUrl). */
  publicSiteBaseUrl?: string | null;
}) {
  const router = useRouter();
  const advancedTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const richEditorRef = React.useRef<BlogRichEditorHandle>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const inlineImageInputRef = React.useRef<HTMLInputElement>(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [unpublishing, setUnpublishing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [previewOpening, setPreviewOpening] = React.useState(false);
  const [autoSaveState, setAutoSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  /** Raw Markdown mode for posts with custom blocks (Callout, etc.). */
  const [useAdvancedMarkdown, setUseAdvancedMarkdown] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [content, setContent] = React.useState("");
  const [coverKey, setCoverKey] = React.useState("");
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");
  const [status, setStatus] = React.useState<string>("draft");
  const [allowlist, setAllowlist] = React.useState<AllowComponent[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = React.useState<{ name: string; slug: string }[]>([]);
  const [historyTick, setHistoryTick] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [imageUrlDialogOpen, setImageUrlDialogOpen] = React.useState(false);
  const [imageUrlDraft, setImageUrlDraft] = React.useState("");
  const [imageAltDraft, setImageAltDraft] = React.useState("Image");
  const [scheduleLocal, setScheduleLocal] = React.useState("");
  const [scheduling, setScheduling] = React.useState(false);
  const [contentParseError, setContentParseError] = React.useState<string | null>(null);
  const [markdownHints, setMarkdownHints] = React.useState<string[]>([]);

  const markDirty = React.useCallback(() => setDirty(true), []);

  const metaDescLen = seoDescription.length;
  const metaDescHint =
    metaDescLen === 0
      ? "neutral"
      : metaDescLen <= 160
        ? metaDescLen >= 120
          ? "good"
          : "short"
        : "long";

  const uploadBlogAsset = React.useCallback(
    async (file: File) => {
      const b64 = await fileToBase64(file);
      const res = (await api.blog.upload({
        organizationId: props.organizationId,
        postId: props.postId,
        fileBase64: b64,
        contentType: file.type || "application/octet-stream",
        originalFilename: file.name,
      })) as { key: string };
      return dashboardBlogAssetUrlFromKey(res.key);
    },
    [props.organizationId, props.postId]
  );

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
        const md = String(p.content_markdown ?? "");
        setContent(md);
        setCoverKey(String(p.cover_image_key ?? ""));
        setSeoTitle(String(p.seo_title ?? ""));
        setSeoDescription(String(p.seo_description ?? ""));
        setStatus(String(p.status ?? "draft"));
        setScheduleLocal(
          toDatetimeLocalValue(
            typeof p.scheduled_publish_at === "string" ? p.scheduled_publish_at : null
          )
        );
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

  React.useEffect(() => {
    if (loading) return;
    setSlug(slugifyFromTitle(title));
  }, [title, loading]);

  React.useEffect(() => {
    if (!props.organizationId) return;
    let c = false;
    void (async () => {
      try {
        const res = (await api.blog.getCategories(props.organizationId)) as {
          categories?: { name: string; slug: string }[];
        };
        if (!c) setCategorySuggestions(res.categories ?? []);
      } catch {
        if (!c) setCategorySuggestions([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [props.organizationId]);

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
        const slugTaken = msg.includes("Slug already") || (/slug/i.test(msg) && /in use|taken|already/i.test(msg));
        if (slugTaken) {
          const bumped = `${slug}-2`;
          setSlug(bumped);
          try {
            const out2 = (await api.blog.updatePost(props.postId, {
              title,
              slug: bumped,
              content_markdown: content,
              cover_image_key: coverKey,
              seo_title: seoTitle || null,
              seo_description: seoDescription || null,
              categories,
            })) as { post?: Record<string, unknown> };
            if (!silent) toast.success("Saved (slug adjusted — another post used that URL)");
            setAutoSaveState("saved");
            setDirty(false);
            const p = out2.post;
            if (p) setStatus(String(p.status ?? "draft"));
            return true;
          } catch (e2: unknown) {
            const m2 = e2 instanceof Error ? e2.message : "Save failed";
            if (!silent) toast.error(m2);
            setAutoSaveState("error");
            return false;
          }
        }
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

  React.useEffect(() => {
    if (!useAdvancedMarkdown || loading) {
      setMarkdownHints([]);
      return;
    }
    setMarkdownHints(quickLintBlogMarkdown(content));
  }, [content, useAdvancedMarkdown, loading]);

  React.useEffect(() => {
    if (!useAdvancedMarkdown || loading) {
      setContentParseError(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = (await api.blog.validateContent(props.postId, {
            content_markdown: content,
          })) as { ok?: boolean; error?: string };
          if (res.ok) setContentParseError(null);
          else setContentParseError(res.error ?? "Invalid content");
        } catch {
          setContentParseError(null);
        }
      })();
    }, 1400);
    return () => window.clearTimeout(t);
  }, [content, useAdvancedMarkdown, loading, props.postId]);

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
    const el = advancedTextareaRef.current;
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
      const alt = file.name.replace(/[\[\]]/g, "");
      if (useAdvancedMarkdown) {
        insertAtCursor(`![${alt}](${url})`);
      } else {
        richEditorRef.current?.insertImageAtCursor(url, alt);
      }
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
    if (useAdvancedMarkdown) {
      insertAtCursor(`![${altEscaped}](${url})`);
    } else {
      richEditorRef.current?.insertImageAtCursor(url, altEscaped);
    }
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
    const snippet = lines.join("\n");
    if (useAdvancedMarkdown) {
      insertAtCursor(snippet);
    } else {
      richEditorRef.current?.insertBlogWidget(def.name);
      toast.success(`${def.name} inserted — edit fields in the editor`);
    }
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
      setScheduleLocal("");
      toast.success("Moved to drafts (unpublished)");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Unpublish failed");
    } finally {
      setUnpublishing(false);
    }
  };

  const schedulePublish = async () => {
    if (!scheduleLocal.trim()) {
      toast.error("Pick a date and time first.");
      return;
    }
    const when = new Date(scheduleLocal);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      toast.error("Schedule time must be in the future.");
      return;
    }
    setScheduling(true);
    try {
      const out = (await api.blog.updatePost(props.postId, {
        status: "scheduled",
        scheduled_publish_at: when.toISOString(),
      })) as { post?: Record<string, unknown> };
      toast.success("Publish scheduled");
      const p = out.post;
      if (p) {
        setStatus(String(p.status ?? "scheduled"));
        const at = p.scheduled_publish_at;
        setScheduleLocal(
          typeof at === "string" ? toDatetimeLocalValue(at) : toDatetimeLocalValue(when.toISOString())
        );
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setScheduling(false);
    }
  };

  const clearSchedule = async () => {
    setScheduling(true);
    try {
      await api.blog.updatePost(props.postId, { status: "draft" });
      setStatus("draft");
      setScheduleLocal("");
      toast.success("Schedule cleared");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not clear schedule");
    } finally {
      setScheduling(false);
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
        <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 p-4 md:p-8 lg:grid-cols-[minmax(300px,400px)_1fr] lg:gap-8">
          <Skeleton className="h-[28rem] w-full rounded-2xl lg:h-auto lg:min-h-[24rem]" />
          <Skeleton className="min-h-[min(70vh,calc(100dvh-12rem))] w-full rounded-2xl lg:min-h-[calc(100dvh-7rem)]" />
        </div>
      </div>
    );
  }

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
              <Badge
                variant={
                  status === "published"
                    ? "default"
                    : status === "scheduled"
                      ? "outline"
                      : "secondary"
                }
              >
                {status}
              </Badge>
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
          {!useAdvancedMarkdown ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/30 bg-primary/5 font-medium"
                data-hist={historyTick}
                disabled={!(richEditorRef.current?.canUndo?.() ?? false)}
                onClick={() => {
                  richEditorRef.current?.undo();
                  setHistoryTick((n) => n + 1);
                }}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/30 bg-primary/5 font-medium"
                data-hist={historyTick}
                disabled={!(richEditorRef.current?.canRedo?.() ?? false)}
                onClick={() => {
                  richEditorRef.current?.redo();
                  setHistoryTick((n) => n + 1);
                }}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
                Redo
              </Button>
            </>
          ) : null}
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
                  ? "Add a title to generate a URL slug"
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
            title={!coverKey.trim() ? "Add a cover image in Post details before publishing" : undefined}
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
          {status === "scheduled" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={scheduling}
              onClick={() => void clearSchedule()}
              className="gap-1.5"
            >
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
              Cancel schedule
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
        className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 md:px-8 lg:grid lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:max-w-[1800px]"
      >
          <Card className="shrink-0 border-border/60 shadow-sm sm:rounded-2xl lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg">Post details</CardTitle>
              <CardDescription className="text-pretty leading-relaxed">
                Cover, title, categories, and how this post appears in search and link previews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onCoverFile(e)}
              />
              <div className="rounded-xl border border-dashed border-border/60 bg-gradient-to-b from-muted/20 to-muted/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cover image</p>
                <p className="mt-1 text-xs text-muted-foreground">Required before you can publish.</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload cover
                  </Button>
                  {coverKey ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dashboardBlogAssetUrlFromKey(coverKey)}
                        alt="Cover preview"
                        className="h-28 max-w-[min(100%,20rem)] rounded-lg border object-cover shadow-sm ring-1 ring-border/40"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setCoverKey("");
                          markDirty();
                        }}
                      >
                        Remove cover
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No cover yet — add one before publishing.</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                  className="text-base"
                  placeholder="Post title"
                />
              </div>
              <div className="space-y-2">
                <Label>URL slug</Label>
                <p className="text-xs text-muted-foreground">
                  Generated from the title. Save to apply on the live site.
                </p>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 font-mono text-sm">
                  <span className="min-w-0 break-all text-foreground">{slug || "…"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categories</Label>
                <BlogCategoryCombobox
                  selected={categories}
                  onChange={(next) => {
                    setCategories(next);
                    markDirty();
                  }}
                  suggestions={categorySuggestions}
                />
              </div>

              {status !== "published" && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold">Schedule publish</p>
                      <p className="text-xs text-muted-foreground">
                        The post goes live automatically at this time (cover image still required). Uses your local
                        timezone.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Label htmlFor="blog_schedule_at" className="text-xs">
                        Date and time
                      </Label>
                      <Input
                        id="blog_schedule_at"
                        type="datetime-local"
                        value={scheduleLocal}
                        onChange={(e) => setScheduleLocal(e.target.value)}
                        disabled={scheduling}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={scheduling}
                        onClick={() => void schedulePublish()}
                        className="gap-1.5"
                      >
                        {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <span>{status === "scheduled" ? "Update schedule" : "Set schedule"}</span>
                      </Button>
                      {status === "scheduled" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={scheduling}
                          onClick={() => void clearSchedule()}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Separator className="bg-border/80" />

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold leading-none">Search &amp; social</p>
                    <p className="text-xs text-muted-foreground">
                      Optional overrides for Google and when this link is shared.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_title">Search title</Label>
                  <Input
                    id="seo_title"
                    value={seoTitle}
                    onChange={(e) => {
                      setSeoTitle(e.target.value);
                      markDirty();
                    }}
                    placeholder={title.trim() || "Same as post title"}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank to use the post title. Aim for clear, specific wording (~50–60 characters).
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-end justify-between gap-2">
                    <Label htmlFor="seo_description" className="leading-snug">
                      Meta description
                    </Label>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] tabular-nums",
                        metaDescHint === "good" && "font-medium text-emerald-600 dark:text-emerald-500",
                        metaDescHint === "short" && "text-muted-foreground",
                        metaDescHint === "long" && "font-medium text-amber-600 dark:text-amber-500",
                        metaDescHint === "neutral" && "text-muted-foreground"
                      )}
                      aria-live="polite"
                    >
                      {metaDescLen} / 160
                    </span>
                  </div>
                  <Textarea
                    id="seo_description"
                    rows={4}
                    value={seoDescription}
                    onChange={(e) => {
                      setSeoDescription(e.target.value);
                      markDirty();
                    }}
                    placeholder="One or two sentences: what readers get from this post."
                    className="min-h-[5.5rem] resize-y text-sm leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {metaDescHint === "long"
                      ? "Consider shortening — search results often truncate around 160 characters."
                      : "Roughly 120–160 characters usually fits search result snippets."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 shadow-md sm:rounded-2xl min-h-[min(62vh,calc(100dvh-11rem))] lg:min-h-[calc(100dvh-7rem)]">
            <CardHeader className="shrink-0 space-y-0 border-b border-border/40 bg-muted/10 pb-4 pt-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl tracking-tight">Content</CardTitle>
                  <CardDescription className="max-w-2xl text-pretty">
                    Write in the visual editor or switch to Markdown for custom blocks. Drafts save automatically.
                  </CardDescription>
                </div>
                {useAdvancedMarkdown ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setUseAdvancedMarkdown(false);
                      toast.message("Switched to visual editor");
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Visual editor
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setUseAdvancedMarkdown(true);
                      toast.message("Raw Markdown — for custom blocks");
                    }}
                  >
                    <FileCode2 className="h-3.5 w-3.5" />
                    Markdown
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 pt-4 sm:p-6 sm:pt-5">
              <input ref={inlineImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onInlineImage(e)} />

              <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/50 bg-muted/30 p-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary" size="sm" className="h-8 gap-1 text-xs">
                      <Paperclip className="h-3.5 w-3.5" />
                      Image
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem onClick={() => inlineImageInputRef.current?.click()} className="cursor-pointer">
                      Upload from device…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setImageUrlDialogOpen(true)} className="cursor-pointer">
                      Paste image link…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary" size="sm" className="h-8 gap-1 text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      Block
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Special block</DropdownMenuLabel>
                    {allowlist.map((c) => (
                      <DropdownMenuItem key={c.name} onClick={() => insertComponentSnippet(c.name)}>
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {useAdvancedMarkdown ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Markdown mode</strong> — for posts with custom blocks (Callout, Gallery, …). Use{" "}
                    <strong>Visual editor</strong> above for normal writing.
                  </p>
                  {contentParseError && (
                    <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {contentParseError}
                    </p>
                  )}
                  {markdownHints.length > 0 && !contentParseError && (
                    <ul className="list-inside list-disc rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                      {markdownHints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <Textarea
                    ref={advancedTextareaRef}
                    spellCheck
                    rows={24}
                    className="min-h-[max(32rem,calc(100dvh-14rem))] w-full resize-y font-mono text-sm leading-relaxed lg:min-h-[calc(100dvh-12rem)]"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      markDirty();
                    }}
                    placeholder="Markdown source…"
                  />
                </div>
              ) : (
                <BlogAssetUploadContext.Provider value={uploadBlogAsset}>
                  <BlogRichEditor
                    key={`${props.postId}-${useAdvancedMarkdown ? "md" : "vis"}`}
                    ref={richEditorRef}
                    initialMarkdown={content}
                    onChange={(md) => {
                      setContent(md);
                      markDirty();
                    }}
                    onInsertImageClick={() => inlineImageInputRef.current?.click()}
                    onHistoryChange={() => setHistoryTick((n) => n + 1)}
                  />
                </BlogAssetUploadContext.Provider>
              )}
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
