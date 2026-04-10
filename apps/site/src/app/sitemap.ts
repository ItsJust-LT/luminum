import { MetadataRoute } from "next"
import { getWebsiteSitemapEntries } from "@itsjust-lt/website-kit/metadata"
import { tryLuminumBlogOpts } from "@/lib/luminum-blog"

const baseUrl = "https://luminum.agency"
const STATIC_ROUTES = [
  "/",
  "/about",
  "/blog",
  "/careers",
  "/case-studies",
  "/contact",
  "/cookies",
  "/portfolio",
  "/privacy-policy",
  "/services",
  "/terms-of-service",
  "/web-design",
]

/** Match website-kit blog fetch revalidation so new posts can appear without redeploy. */
export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogFetch = tryLuminumBlogOpts()
  const strictSitemap = process.env.SITEMAP_STRICT === "1"
  if (!blogFetch) {
    console.warn(
      "[sitemap] LUMINUM_WEBSITE_ID missing; emitting static routes only."
    )
    return STATIC_ROUTES.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route.includes("privacy") || route.includes("terms") || route.includes("cookies") ? "yearly" : "weekly",
      priority: route === "/" ? 1 : route.includes("privacy") || route.includes("terms") || route.includes("cookies") ? 0.3 : 0.8,
    }))
  }

  const apiBaseUrl =
    blogFetch.apiBaseUrl ?? process.env.LUMINUM_API_URL ?? "https://api.luminum.app"

  return (await getWebsiteSitemapEntries({
    ...blogFetch,
    apiBaseUrl,
    baseUrl,
    staticRoutes: STATIC_ROUTES,
    blogPathPrefix: "/blog",
    includeCategories: false,
    includeBlogIndex: true,
    pageSize: 50,
    strict: strictSitemap,
    onError: (err, stage) => {
      console.error(`[sitemap] getWebsiteSitemapEntries failed at "${stage}":`, err)
    },
  })) as MetadataRoute.Sitemap
}
