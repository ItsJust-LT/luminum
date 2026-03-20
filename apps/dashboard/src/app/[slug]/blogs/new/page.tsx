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
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="mx-auto max-w-lg space-y-8 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="shrink-0 rounded-lg" asChild>
          <Link href={`/${slug}/blogs`} aria-label="Back to blog posts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New blog post</h1>
          <p className="text-sm text-muted-foreground">Start with a title — you can add content next.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              First step
            </CardTitle>
            <CardDescription>We&apos;ll open the full editor with auto-save right after.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Announcing our spring launch"
                onKeyDown={(e) => e.key === "Enter" && void create()}
              />
            </div>
            <Button type="button" disabled={busy} onClick={() => void create()} className="w-full gap-2 sm:w-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create &amp; open editor
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
