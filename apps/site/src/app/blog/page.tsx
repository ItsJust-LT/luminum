import Link from "next/link"
import Image from "next/image"
import { getPublishedPosts } from "@itsjust-lt/website-kit/blog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { tryLuminumBlogOpts } from "@/lib/luminum-blog"
import { SITE } from "@/lib/site-copy"
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react"

const PAGE_SIZE = 12

function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

type Props = {
  searchParams?: Promise<{ page?: string }>
}

export default async function BlogPage({ searchParams }: Props) {
  const sp = await searchParams
  const page = Math.max(1, Number.parseInt(sp?.page ?? "1", 10) || 1)

  const opts = tryLuminumBlogOpts()
  let posts: Awaited<ReturnType<typeof getPublishedPosts>> | null = null
  let fetchError = false

  if (opts) {
    try {
      posts = await getPublishedPosts({
        ...opts,
        page,
        limit: PAGE_SIZE,
      })
    } catch {
      fetchError = true
    }
  }

  const totalPages = posts?.totalPages ?? 1
  const list = posts?.posts ?? []
  const showFeatured = page === 1 && list.length > 0
  const featured = showFeatured ? list[0] : null
  const gridPosts = showFeatured ? list.slice(1) : list

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-16 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-20 sm:pt-28 md:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-white" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-[#302cff]/18 to-transparent blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-[#ff6b35]/14 to-transparent blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-[#00d9ff]/10 to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#302cff]/20 bg-[#302cff]/5 px-4 py-2 text-sm font-semibold text-[#302cff]">
              <Sparkles className="h-4 w-4" aria-hidden />
              {SITE.name} · Blog
            </span>
            <h1 className="font-heading text-balance text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Insights for{" "}
              <span className="bg-gradient-to-r from-[#302cff] to-[#5b57ff] bg-clip-text text-transparent">
                modern brands
              </span>
            </h1>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-slate-600 sm:text-xl">
              Strategy, web, SEO, and product notes — published from your Luminum workspace and rendered here with care.
            </p>
          </div>
        </div>
      </section>

      <section className="relative border-t border-slate-100 bg-slate-50/40 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl">
          {!opts ? (
            <div className="mx-auto max-w-2xl rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 to-white px-6 py-8 text-center shadow-sm">
              <p className="text-sm font-medium text-amber-950 sm:text-base">
                Set{" "}
                <kbd className="rounded-md border border-amber-300/60 bg-white px-1.5 py-0.5 font-mono text-xs">
                  LUMINUM_WEBSITE_ID
                </kbd>{" "}
                (and optional{" "}
                <kbd className="rounded-md border border-amber-300/60 bg-white px-1.5 py-0.5 font-mono text-xs">
                  LUMINUM_API_URL
                </kbd>
                ) in your env file to load live posts from Luminum.
              </p>
            </div>
          ) : fetchError ? (
            <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-slate-600">
              We couldn&apos;t load the blog right now. If blogs aren&apos;t enabled for your organization, the public API
              returns 404 — that&apos;s expected until Luminum is configured.
            </p>
          ) : list.length === 0 ? (
            <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-slate-600">
              No published posts yet. Create and publish a post in the Luminum dashboard to see it here.
            </p>
          ) : (
            <>
              {featured ? (
                <Link href={`/blog/${featured.slug}`} className="group mb-12 block sm:mb-14">
                  <article className="overflow-hidden rounded-3xl border-2 border-slate-200/90 bg-white shadow-xl shadow-slate-900/5 transition-all duration-300 hover:border-[#302cff]/25 hover:shadow-2xl">
                    <div className="grid gap-0 lg:grid-cols-12 lg:gap-0">
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 lg:col-span-7 lg:aspect-auto lg:min-h-[22rem]">
                        <Image
                          src={featured.coverImageUrl || "/placeholder.svg"}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 1024px) 100vw, 58vw"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent lg:bg-gradient-to-r" />
                        {featured.categories?.[0] ? (
                          <div className="absolute left-5 top-5">
                            <Badge className="border-0 bg-[#302cff] px-3 py-1 text-xs font-bold text-white shadow-lg shadow-[#302cff]/30">
                              {featured.categories[0]}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                      <CardContent className="flex flex-col justify-center p-8 lg:col-span-5 lg:p-10">
                        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#302cff]">
                          <span className="rounded-full bg-[#302cff]/10 px-3 py-0.5 text-xs uppercase tracking-wider">
                            Featured
                          </span>
                        </p>
                        <h2 className="font-heading text-balance text-2xl font-black leading-tight text-slate-900 transition-colors group-hover:text-[#302cff] sm:text-3xl lg:text-4xl">
                          {featured.title}
                        </h2>
                        {featured.publishedAt ? (
                          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500">
                            <CalendarDays className="h-4 w-4 text-[#302cff]" aria-hidden />
                            <time dateTime={featured.publishedAt}>{formatPostDate(featured.publishedAt)}</time>
                          </p>
                        ) : null}
                        {featured.categories && featured.categories.length > 1 ? (
                          <p className="mt-2 text-xs font-medium text-slate-400">
                            {featured.categories.slice(1).join(" · ")}
                          </p>
                        ) : null}
                        <span className="mt-6 inline-flex items-center text-sm font-bold text-[#302cff]">
                          Read article
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </CardContent>
                    </div>
                  </article>
                </Link>
              ) : null}

              {gridPosts.length > 0 ? (
                <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {gridPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="group block h-full">
                      <Card className="h-full overflow-hidden rounded-2xl border-2 border-slate-200/90 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#302cff]/25 hover:shadow-xl">
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                          <Image
                            src={post.coverImageUrl || "/placeholder.svg"}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          {post.categories?.[0] ? (
                            <div className="absolute left-4 top-4">
                              <Badge className="border-0 bg-white/95 font-bold text-[#302cff] shadow-md backdrop-blur-sm">
                                {post.categories[0]}
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                        <CardContent className="flex flex-col p-6">
                          <h2 className="font-heading mb-3 line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#302cff] sm:text-xl">
                            {post.title}
                          </h2>
                          {post.publishedAt ? (
                            <time
                              dateTime={post.publishedAt}
                              className="flex items-center gap-2 text-sm font-medium text-slate-500"
                            >
                              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                              {formatPostDate(post.publishedAt)}
                            </time>
                          ) : null}
                          {post.categories && post.categories.length > 1 ? (
                            <p className="mt-2 text-xs font-medium text-slate-400">
                              {post.categories.slice(1).join(" · ")}
                            </p>
                          ) : null}
                          <span className="mt-4 inline-flex items-center text-sm font-bold text-[#302cff]">
                            Read more
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : null}

              {totalPages > 1 ? (
                <nav
                  className="mt-14 flex flex-wrap items-center justify-center gap-4 text-sm"
                  aria-label="Blog pagination"
                >
                  {page > 1 ? (
                    <Button variant="outline" asChild className="rounded-xl border-2 font-semibold">
                      <Link href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}>Previous</Link>
                    </Button>
                  ) : null}
                  <span className="font-medium text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Button variant="outline" asChild className="rounded-xl border-2 font-semibold">
                      <Link href={`/blog?page=${page + 1}`}>Next</Link>
                    </Button>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section
        className="relative overflow-hidden px-4 py-20 sm:py-24"
        aria-labelledby="blog-cta-heading"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#302cff] via-[#5b57ff] to-[#00a8cc]" />
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-[#ff6b35]/40 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-[#7cff6b]/30 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 id="blog-cta-heading" className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">
            Want this for your brand?
          </h2>
          <p className="mt-4 text-lg text-white/90 sm:text-xl">
            We design and build the kind of sites these articles talk about — fast, SEO-ready, and built to convert.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-2xl border-0 bg-white px-8 font-bold text-[#302cff] shadow-xl hover:bg-white/95"
            >
              <Link href="/contact">
                Start a project
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-2xl border-2 border-white/40 bg-white/10 px-8 font-bold text-white backdrop-blur-sm hover:bg-white/20"
            >
              <Link href="/services">View services</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
