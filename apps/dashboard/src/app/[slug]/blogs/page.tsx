"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { publicBlogAssetUrlFromKey } from "@/lib/blog-public-url";
import { toast } from "sonner";

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  status: string;
  cover_image_key?: string;
  published_at?: string | null;
  updated_at?: string;
};

export default function OrgBlogsListPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;
    let c = false;
    (async () => {
      try {
        const res = (await api.blog.listPosts(organization.id, 1, 50)) as { posts: BlogRow[] };
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

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) {
    router.push("/sign-in");
    return null;
  }
  if (!organization) return <LoadingAnimation />;

  // Route guard: blogs feature not enabled (direct URL access blocked)
  if (!organization.blogs_enabled) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-xl border border-border/60 bg-card/50 p-6 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Blogs not enabled</h3>
          <p className="text-sm text-muted-foreground mb-5">
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
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog posts</h1>
          <p className="text-sm text-muted-foreground">Create and publish MDX-like posts for your public site.</p>
        </div>
        <Button asChild>
          <Link href={`/${slug}/blogs/new`}>New post</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-card/50 p-4"
            >
              {p.cover_image_key ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicBlogAssetUrlFromKey(p.cover_image_key)}
                  alt=""
                  className="h-14 w-24 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-14 w-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                  No cover
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
              </div>
              <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${slug}/blogs/${p.id}/edit`}>Edit</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
