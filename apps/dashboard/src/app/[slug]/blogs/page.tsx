"use client"

import { useSession } from "@/lib/auth/client"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useParams, useRouter } from "next/navigation"
import LoadingAnimation from "@/components/LoadingAnimation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { dashboardBlogAssetUrlFromKey } from "@/lib/blog-public-url"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  BookOpen,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

type BlogRow = {
  id: string
  slug: string
  title: string
  status: string
  cover_image_key?: string
  published_at?: string | null
  scheduled_publish_at?: string | null
  updated_at?: string
}

type StatusFilter = "all" | "published" | "draft" | "scheduled"

function statusBadgeClass(status: string) {
  switch (status) {
    case "published":
      return "border-chart-2/35 bg-chart-2/10 text-chart-2 border"
    case "scheduled":
      return "border-chart-3/35 bg-chart-3/12 text-chart-3 border"
    case "draft":
      return "border-border bg-muted/50 text-muted-foreground border"
    default:
      return "border-border bg-muted/30 border"
  }
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function OrgBlogsListPage() {
  const { data: session, isPending: sessionPending } = useSession()
  const { organization, loading: orgLoading } = useOrganization()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [posts, setPosts] = useState<BlogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!organization?.id) return
    let c = false
    void (async () => {
      try {
        const res = (await api.blog.listPosts(organization.id, 1, 100)) as { posts: BlogRow[] }
        if (!c) setPosts(res.posts ?? [])
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load posts")
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [organization?.id])

  const filtered = useMemo(() => {
    let list = posts
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      )
    }
    return list
  }, [posts, query, statusFilter])

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.status === "published").length
    const draft = posts.filter((p) => p.status === "draft").length
    const scheduled = posts.filter((p) => p.status === "scheduled").length
    return { published, draft, scheduled, total: posts.length }
  }, [posts])

  const filtersActive = query.trim() !== "" || statusFilter !== "all"

  const clearFilters = () => {
    setQuery("")
    setStatusFilter("all")
  }

  const removePost = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.blog.deletePost(deleteId)
      setPosts((prev) => prev.filter((p) => p.id !== deleteId))
      toast.success("Post deleted")
      setDeleteId(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleting(false)
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
            <BookOpen className="text-muted-foreground mx-auto h-10 w-10" />
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Blog</h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
                Draft, schedule, and publish posts for your site. The editor saves automatically.
              </p>
            </div>
          </div>
          <Button asChild className="w-full shrink-0 gap-2 sm:w-auto">
            <Link href={`/${slug}/blogs/new`}>
              <Plus className="h-4 w-4" />
              New post
            </Link>
          </Button>
        </div>
        <Separator />

        {!loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="app-card">
              <CardContent className="pt-5 pb-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">All posts</p>
                <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="app-card">
              <CardContent className="pt-5 pb-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Published</p>
                <p className="text-chart-2 mt-1 text-2xl font-semibold tabular-nums">{stats.published}</p>
              </CardContent>
            </Card>
            <Card className="app-card">
              <CardContent className="pt-5 pb-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Scheduled</p>
                <p className="text-chart-3 mt-1 text-2xl font-semibold tabular-nums">{stats.scheduled}</p>
              </CardContent>
            </Card>
            <Card className="app-card">
              <CardContent className="pt-5 pb-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Drafts</p>
                <p className="text-muted-foreground mt-1 text-2xl font-semibold tabular-nums">{stats.draft}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          role="search"
          aria-label="Filter blog posts"
        >
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              className="pl-9 pr-9"
              placeholder="Search title or slug…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("")
              }}
              aria-label="Search posts"
            />
            {query ? (
              <button
                type="button"
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Status</span>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
                {filtersActive ? (
              <Button type="button" variant="ghost" size="sm" className="sm:mb-0.5" onClick={clearFilters}>
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>

        {!loading && stats.total > 0 && (
          <p className="text-muted-foreground text-xs" aria-live="polite">
            Showing <span className="text-foreground font-medium">{filtered.length}</span>
            {filtered.length !== stats.total ? ` of ${stats.total}` : ""}{" "}
            {filtered.length === 1 ? "post" : "posts"}
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="app-card overflow-hidden">
              <CardContent className="flex gap-4 p-4">
                <Skeleton className="h-20 w-36 shrink-0 rounded-xl" />
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
        <Card className="app-card border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <BookOpen className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground max-w-md text-sm">
              {posts.length === 0
                ? "No posts yet. Create your first one to get started."
                : "Nothing matches your search or status filter."}
            </p>
            {posts.length === 0 ? (
              <Button asChild>
                <Link href={`/${slug}/blogs/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create post
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="app-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-muted/30 flex justify-center border-b p-3">
                    {p.cover_image_key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dashboardBlogAssetUrlFromKey(p.cover_image_key)}
                        alt=""
                        className="border-border/50 h-36 w-full max-w-sm rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground flex h-24 w-full max-w-sm items-center justify-center rounded-lg border border-dashed text-xs">
                        No cover image
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={`/${slug}/blogs/${p.id}/edit`}
                        className="text-foreground hover:text-primary min-w-0 flex-1 font-semibold leading-snug"
                      >
                        {p.title}
                      </Link>
                      <Badge variant="outline" className={cn("shrink-0 capitalize", statusBadgeClass(p.status))}>
                        {p.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground font-mono text-xs">/{p.slug}</p>
                    {p.updated_at ? (
                      <p className="text-muted-foreground text-xs">Updated {formatShortDate(p.updated_at)}</p>
                    ) : null}
                    {p.status === "scheduled" && p.scheduled_publish_at ? (
                      <p className="text-chart-3 text-xs">Goes live {formatShortDate(p.scheduled_publish_at)}</p>
                    ) : null}
                    {p.status === "published" && p.published_at ? (
                      <p className="text-chart-2 text-xs">Published {formatShortDate(p.published_at)}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="secondary" size="sm" className="flex-1" asChild>
                        <Link href={`/${slug}/blogs/${p.id}/edit`}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label={`More for ${p.title}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Post</DropdownMenuLabel>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="app-card hidden md:block">
            <ScrollArea className="max-h-[min(32rem,70vh)] w-full rounded-lg md:max-h-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Cover</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="hidden lg:table-cell w-[180px]">Dates</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="align-middle">
                        {p.cover_image_key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={dashboardBlogAssetUrlFromKey(p.cover_image_key)}
                            alt=""
                            className="border-border/50 h-14 w-[5.5rem] rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="text-muted-foreground flex h-14 w-[5.5rem] items-center justify-center rounded-lg border border-dashed text-[10px] leading-tight">
                            No cover
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[280px]">
                        <Link
                          href={`/${slug}/blogs/${p.id}/edit`}
                          className="text-foreground hover:text-primary font-medium leading-snug hover:underline"
                        >
                          {p.title}
                        </Link>
                        <p className="text-muted-foreground truncate font-mono text-xs">/{p.slug}</p>
                        {p.updated_at ? (
                          <p className="text-muted-foreground mt-1 text-xs lg:hidden">
                            Updated {formatShortDate(p.updated_at)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("capitalize", statusBadgeClass(p.status))}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden align-middle text-xs lg:table-cell">
                        <div className="space-y-1">
                          {p.updated_at && <div>Updated {formatShortDate(p.updated_at)}</div>}
                          {p.status === "scheduled" && p.scheduled_publish_at && (
                            <div className="text-chart-3">Live {formatShortDate(p.scheduled_publish_at)}</div>
                          )}
                          {p.status === "published" && p.published_at && (
                            <div className="text-chart-2">Out {formatShortDate(p.published_at)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit">
                            <Link href={`/${slug}/blogs/${p.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Post</DropdownMenuLabel>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If you only want to hide it from the site, unpublish from the editor instead.
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
    </AppPageContainer>
  )
}
