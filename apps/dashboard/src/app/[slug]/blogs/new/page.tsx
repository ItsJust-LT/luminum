"use client"

import { useSession } from "@/lib/auth/client"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useParams, useRouter } from "next/navigation"
import LoadingAnimation from "@/components/LoadingAnimation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

export default function NewBlogPostPage() {
  const { data: session, isPending: sessionPending } = useSession()
  const { organization, loading: orgLoading } = useOrganization()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const create = async () => {
    if (!organization?.id) return
    setBusy(true)
    try {
      const res = (await api.blog.createPost({
        organizationId: organization.id,
        title: title.trim() || "Untitled",
      })) as { post: { id: string } }
      router.push(`/${slug}/blogs/${res.post.id}/edit`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not create post")
    } finally {
      setBusy(false)
    }
  }

  if (sessionPending || orgLoading) return <LoadingAnimation />
  if (!session) {
    router.push("/sign-in")
    return null
  }
  if (!organization) return <LoadingAnimation />

  if (!organization.blogs_enabled) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <Card className="app-card mx-auto max-w-md">
          <CardContent className="flex flex-col gap-4 py-10 text-center">
            <Sparkles className="text-muted-foreground mx-auto h-10 w-10" />
            <h2 className="text-foreground text-lg font-semibold">Blog is not enabled</h2>
            <p className="text-muted-foreground text-sm">
              Ask an administrator to turn on the blog for this organization.
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/${slug}/dashboard`)}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" size="sm" className="w-fit gap-2" asChild>
            <Link href={`/${slug}/blogs`} aria-label="Back to blog posts">
              <ArrowLeft className="h-4 w-4" />
              All posts
            </Link>
          </Button>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">New post</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Start with a title — you&apos;ll jump into the full editor next.
            </p>
          </div>
        </div>
        <Separator />
      </header>

      <div className="mx-auto max-w-xl">
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="text-base">Title</CardTitle>
            <CardDescription>The editor opens right after this step with auto-save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Post title</Label>
              <Input
                ref={titleRef}
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Announcing our spring launch"
                onKeyDown={(e) => e.key === "Enter" && !busy && void create()}
                autoComplete="off"
              />
              <p className="text-muted-foreground text-xs">Press Enter or use the button below.</p>
            </div>
            <Button type="button" disabled={busy} onClick={() => void create()} className="w-full gap-2 sm:w-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create and open editor
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppPageContainer>
  )
}
