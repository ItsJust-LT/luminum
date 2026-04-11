/**
 * Single pathname key for analytics grouping and display.
 * Merges full URLs that share the same path, strips trailing slashes, and treats
 * common homepage aliases (`/home`, `/index`, …) as `/` so top-pages are not duplicated.
 */
export function normalizeAnalyticsPagePath(raw: string): string {
  let s = (raw || "").trim()
  if (!s) return "/"
  try {
    if (s.includes("://")) {
      s = new URL(s).pathname
    }
  } catch {
    /* keep s as path-like string */
  }
  if (!s.startsWith("/")) s = `/${s}`
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1)
  const lower = s.toLowerCase()
  if (lower === "/home" || lower === "/index" || lower === "/index.html") return "/"
  return s || "/"
}

/**
 * Pick the most common non-empty title for a URL from event rows (stable UX for top-pages, etc.).
 */
export function dominantTitleFromVotes(votes: Record<string, number>): string | undefined {
  let best: string | undefined
  let bestCount = 0
  for (const [t, c] of Object.entries(votes)) {
    if (c > bestCount) {
      best = t
      bestCount = c
    }
  }
  return best
}

type UrlTitleRow = { url: string | null; page_title: string | null }

export function aggregateUrlCountsWithTitles(rows: UrlTitleRow[]): { key: string; count: number; title?: string }[] {
  const byUrl = new Map<string, { count: number; titleVotes: Record<string, number> }>()
  for (const e of rows) {
    const url = normalizeAnalyticsPagePath((e.url || "").trim() || "/")
    if (!byUrl.has(url)) byUrl.set(url, { count: 0, titleVotes: {} })
    const acc = byUrl.get(url)!
    acc.count += 1
    const t = (e.page_title || "").trim()
    if (t) acc.titleVotes[t] = (acc.titleVotes[t] || 0) + 1
  }
  return [...byUrl.entries()]
    .map(([key, { count, titleVotes }]) => {
      const title = dominantTitleFromVotes(titleVotes)
      return title ? { key, count, title } : { key, count }
    })
    .sort((a, b) => b.count - a.count)
}

/** Merge dominant titles into { page, count } lists (entry/exit). */
export function attachTitlesToPageCounts(
  pages: { page: string; count: number }[],
  rows: UrlTitleRow[]
): { page: string; count: number; title?: string }[] {
  const all = aggregateUrlCountsWithTitles(rows)
  const titleByUrl = new Map(all.map((x) => [x.key, x.title]))
  return pages.map((p) => {
    const title = titleByUrl.get(normalizeAnalyticsPagePath(p.page))
    return title ? { ...p, title } : { ...p }
  })
}

export function dominantTitleForUrl(rows: UrlTitleRow[], url: string): string | undefined {
  const norm = normalizeAnalyticsPagePath((url || "").trim() || "/")
  const votes: Record<string, number> = {}
  for (const e of rows) {
    const u = normalizeAnalyticsPagePath((e.url || "").trim() || "/")
    if (u !== norm) continue
    const t = (e.page_title || "").trim()
    if (t) votes[t] = (votes[t] || 0) + 1
  }
  return dominantTitleFromVotes(votes)
}
