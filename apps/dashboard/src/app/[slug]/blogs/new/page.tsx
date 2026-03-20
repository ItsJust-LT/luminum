"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function NewBlogPostPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!organization?.id) return;
    setBusy(true);
    try {
      const res = (await api.blog.createPost({
        organizationId: organization.id,
        title: title.trim() || "Untitled",
      })) as { post: { id: string } };
      router.push(`/${slug}/blogs/${res.post.id}/edit`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not create post");
    } finally {
      setBusy(false);
    }
  };

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
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">New blog post</h1>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
      </div>
      <Button type="button" disabled={busy} onClick={() => void create()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & edit"}
      </Button>
    </div>
  );
}
