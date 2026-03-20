"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { dashboardBlogAssetUrlFromKey } from "@/lib/blog-public-url";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  cover_image_key?: string;
  published_at?: string | null;
  updated_at?: string;
};

type StatusFilter = "all" | "published" | "draft";

export default function OrgBlogsListPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    let c = false;
    (async () => {
      try {
        const res = (await api.blog.listPosts(organization.id, 1, 100)) as { posts: BlogRow[] };
        if (!c) setPosts(res.posts ?? []);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load posts");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [organization?.id]);

  const filtered = useMemo(() => {
    let list = posts;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [posts, query, statusFilter]);

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.status === "published").length;
    const draft = posts.filter((p) => p.status === "draft").length;
    return { published, draft, total: posts.length };
  }, [posts]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
  };

  const removePost = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.blog.deletePost(deleteId);
      setPosts((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Post deleted");
      setDeleteId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) {
    router.push("/sign-in");
    return null;
  }
  if (!organization) return <LoadingAnimation />;

  if (!organization.blogs_enabled) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-xl border border-border/60 bg-card/50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-foreground">Blogs not enabled</h3>
          <p className="mb-5 text-sm text-muted-foreground">
            Blogs are not enabled for this organization. Contact an administrator to enable access.
          </p>
          <Button onClick={() => router.push(`/${slug}/dashboard`)} variant="outline" className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 pb-16 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0 rounded-lg" asChild>
            <Link href={`/${slug}/dashboard`} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
            </div>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Draft, publish, and manage posts for your public site. Drafts auto-save in the editor.
            </p>
            {!loading && stats.total > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{stats.total}</span>{" "}
                {stats.total === 1 ? "post" : "posts"}
                <span className="mx-1.5 text-border">·</span>
                <span>{stats.published} published</span>
                <span className="mx-1.5 text-border">·</span>
                <span>{stats.draft} draft</span>
              </p>
            )}
          </div>
        </div>
        <Button asChild className="gap-2 shadow-sm">
          <Link href={`/${slug}/blogs/new`}>
            <Plus className="h-4 w-4" />
            New post
          </Link>
        </Button>
      </motion.div>

      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        role="search"
        aria-label="Filter blog posts"
      >
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            placeholder="Search by title or slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            aria-label="Search posts"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Status
          </span>
          {(["all", "published", "draft"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              variant={statusFilter === f ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 rounded-full text-xs capitalize",
                statusFilter === f && "ring-1 ring-border ring-offset-2 ring-offset-background"
              )}
              onClick={() => setStatusFilter(f)}
              aria-pressed={statusFilter === f}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {!loading && stats.total > 0 && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Showing <span className="font-medium text-foreground">{filtered.length}</span>
          {filtered.length !== stats.total ? ` of ${stats.total}` : ""}{" "}
          {filtered.length === 1 ? "post" : "posts"}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden border-border/60">
              <CardContent className="flex gap-4 p-4">
                <Skeleton className="h-16 w-28 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-16 text-center"
        >
          <p className="text-muted-foreground">
            {posts.length === 0 ? "No posts yet — create your first one." : "No posts match your filters."}
          </p>
          {posts.length === 0 ? (
            <Button asChild className="mt-4">
              <Link href={`/${slug}/blogs/new`}>Create post</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" className="mt-4" onClick={clearFilters}>
              Clear search &amp; filters
            </Button>
          )}
        </motion.div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((p, idx) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="overflow-hidden border-border/60 bg-card/40 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40">
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    {p.cover_image_key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dashboardBlogAssetUrlFromKey(p.cover_image_key)}
                        alt=""
                        className="h-16 w-28 rounded-lg border border-border/50 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-28 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
                        No cover
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${slug}/blogs/${p.id}/edit`}
                        className="font-semibold leading-snug text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                      >
                        {p.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
                      {p.updated_at && (
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          Updated {new Date(p.updated_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={p.status === "published" ? "default" : "secondary"} className="capitalize">
                      {p.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${slug}/blogs/${p.id}/edit`}>Edit</Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More actions for ${p.title}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/${slug}/blogs/${p.id}/edit`}>Open editor</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Use Unpublish in the editor if you only want to hide it from the site.
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
