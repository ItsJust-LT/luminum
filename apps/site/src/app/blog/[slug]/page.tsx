import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getPublishedPostBySlug,
  renderBlogSpec,
  type BlogComponentMap,
} from "@itsjust-lt/website-kit/blog"
import { blogSeoToMetadata } from "@itsjust-lt/website-kit/metadata"
import { tryLuminumBlogOpts } from "@/lib/luminum-blog"
import { luminumBlogMap } from "@/components/blog/luminum-blog-map"
import { BLOG_MARKDOWN_CLASSNAME, BLOG_ROOT_CLASS_NAME } from "@/lib/blog-typography"
import { SITE } from "@/lib/site-copy"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays } from "lucide-react"

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ previewToken?: string }>
}

function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { previewToken } = (await searchParams) ?? {}
  const opts = tryLuminumBlogOpts({
    previewToken,
    noStore: Boolean(previewToken),
  })

  if (!opts) {
    return { title: "Blog" }
  }

  const data = await getPublishedPostBySlug({
    ...opts,
    slug,
  })

  if (!data) return { title: "Not found" }

  return blogSeoToMetadata(data.seo) as Metadata
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { previewToken } = (await searchParams) ?? {}
  const opts = tryLuminumBlogOpts({
    previewToken,
    noStore: Boolean(previewToken),
  })

  if (!opts) {
    notFound()
  }

  const data = await getPublishedPostBySlug({
    ...opts,
    slug,
  })

  if (!data) notFound()

  const isPreview = Boolean(data.preview)
  const spec = data.renderSpec
  const hasBody = spec && spec.version === 1 && Array.isArray(spec.blocks) && spec.blocks.length > 0

  return (
    <article className="relative min-h-screen bg-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#302cff]/12 to-transparent blur-3xl" />
        <div className="absolute -left-20 top-[40%] h-80 w-80 rounded-full bg-gradient-to-tr from-[#ff6b35]/10 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-[calc(5rem+env(safe-area-inset-top))] sm:pt-28 md:pt-32">
        <Button variant="ghost" asChild className="-ml-2 mb-8 rounded-xl font-semibold text-slate-600 hover:bg-[#302cff]/5 hover:text-[#302cff]">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Link>
        </Button>

        {isPreview ? (
          <div
            className="mb-8 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-50 to-orange-50/80 px-4 py-3 text-sm font-medium text-amber-950 shadow-sm"
            role="status"
          >
            Draft preview — not indexed; do not share publicly.
          </div>
        ) : null}

        <header className="mb-10">
          {data.post.categories?.length ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {data.post.categories.map((cat) => (
                <Badge
                  key={cat}
                  className="rounded-full border-0 bg-[#302cff]/10 px-3 py-1 text-xs font-bold text-[#302cff]"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          ) : null}

          <h1 className="font-heading text-balance text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl">
            {data.post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-500">
            {data.post.publishedAt ? (
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#302cff]" aria-hidden />
                <time dateTime={data.post.publishedAt}>{formatPostDate(data.post.publishedAt)}</time>
              </span>
            ) : null}
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>{SITE.name}</span>
          </div>
        </header>

        <div className="relative mb-12 overflow-hidden rounded-3xl bg-slate-100 shadow-xl ring-1 ring-slate-200/80">
          <div className="aspect-video w-full sm:aspect-[2/1]">
            <Image
              src={data.post.coverImageUrl || "/placeholder.svg"}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 48rem"
              priority
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent" />
        </div>

        <div
          className={
            isPreview
              ? "rounded-3xl border border-slate-200/80 bg-slate-50/50 px-4 py-8 sm:px-8"
              : undefined
          }
        >
          {hasBody ? (
            renderBlogSpec(spec, luminumBlogMap as BlogComponentMap, {
              rootClassName: cnBlogRoot(isPreview),
              markdownClassName: BLOG_MARKDOWN_CLASSNAME,
            })
          ) : (
            <p className="text-center text-slate-600">This post doesn&apos;t have rendered content yet.</p>
          )}
        </div>

        <footer className="mt-16 border-t border-slate-200 pt-10">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center">
            <p className="font-heading text-lg font-bold text-slate-900">Enjoyed this article?</p>
            <p className="mt-2 text-sm text-slate-600">Explore more on the blog or talk to us about your next launch.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="rounded-xl bg-gradient-to-r from-[#302cff] to-[#5b57ff] font-semibold text-white shadow-lg shadow-[#302cff]/25"
              >
                <Link href="/blog">More articles</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-2 font-semibold">
                <Link href="/contact">Get in touch</Link>
              </Button>
            </div>
          </div>
        </footer>
      </div>

      {data.seo.jsonLd && !isPreview ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data.seo.jsonLd) }}
        />
      ) : null}
    </article>
  )
}

function cnBlogRoot(isPreview: boolean) {
  return [BLOG_ROOT_CLASS_NAME, isPreview ? "pt-2" : ""].filter(Boolean).join(" ")
}
