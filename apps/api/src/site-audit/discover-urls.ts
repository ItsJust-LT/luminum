/**
 * Discover URL paths to audit (same host only) via sitemap.xml / sitemap index, with HTML link fallback.
 */

function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase();
}

function hostMatchesPage(hostname: string, baseDomain: string): boolean {
  return hostname.replace(/^www\./, "").toLowerCase() === normalizeDomain(baseDomain);
}

function toPath(locUrl: URL, baseDomain: string): string | null {
  if (!hostMatchesPage(locUrl.hostname, baseDomain)) return null;
  let p = locUrl.pathname || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  const q = locUrl.search;
  const path = p + (q && q !== "?" ? q : "");
  return path.length > 2048 ? null : path;
}

const MAX_SITEMAPS = 12;
const FETCH_TIMEOUT_MS = 18_000;

async function fetchText(url: string): Promise<string | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent": "LuminumSiteAudit/1.0",
        Accept: "application/xml,text/xml,text/plain,*/*",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc[^>]*>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const u = m[1].trim();
    if (u) out.push(u);
  }
  return out;
}

function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml) || /xmlns[^>]*sitemap\/0\.9\/siteindex/i.test(xml);
}

export function getMaxAuditUrls(): number {
  const n = parseInt(process.env.SITE_AUDIT_MAX_URLS ?? "40", 10);
  return Math.min(Math.max(1, n), 100);
}

/**
 * Returns unique paths (e.g. `/`, `/pricing`) for the same registrable domain, capped by SITE_AUDIT_MAX_URLS.
 */
export async function discoverPathsForDomain(domain: string): Promise<string[]> {
  const base = normalizeDomain(domain);
  const max = getMaxAuditUrls();
  const paths = new Set<string>();
  paths.add("/");

  const seenSitemaps = new Set<string>();

  async function consumeSitemap(sitemapUrl: string, depth: number): Promise<void> {
    if (depth > 3 || seenSitemaps.size >= MAX_SITEMAPS) return;
    if (seenSitemaps.has(sitemapUrl)) return;
    seenSitemaps.add(sitemapUrl);

    const xml = await fetchText(sitemapUrl);
    if (!xml) return;

    if (isSitemapIndex(xml)) {
      const locs = extractLocs(xml);
      for (const loc of locs) {
        if (seenSitemaps.size >= MAX_SITEMAPS) break;
        try {
          await consumeSitemap(loc, depth + 1);
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const locs = extractLocs(xml);
    for (const raw of locs) {
      if (paths.size >= max) break;
      try {
        const u = new URL(raw);
        const p = toPath(u, base);
        if (p) paths.add(p);
      } catch {
        /* invalid */
      }
    }
  }

  const roots = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://www.${base}/sitemap.xml`,
  ];
  const tried = new Set<string>();
  for (const s of roots) {
    if (tried.has(s)) continue;
    tried.add(s);
    await consumeSitemap(s, 0);
    if (paths.size > 1) break;
  }

  if (paths.size <= 1) {
    await crawlHomepageLinks(domain, base, paths, max);
  }

  const list = Array.from(paths);
  list.sort((a, b) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });
  return list.slice(0, max);
}

async function crawlHomepageLinks(
  domain: string,
  base: string,
  paths: Set<string>,
  max: number,
): Promise<void> {
  const home = `https://${domain}/`;
  const html = await fetchText(home);
  if (!html || paths.size >= max) return;

  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && paths.size < max) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("mailto:")) continue;
    try {
      const u = new URL(raw, home);
      if (!hostMatchesPage(u.hostname, base)) continue;
      const p = toPath(u, base);
      if (p) paths.add(p);
    } catch {
      /* ignore */
    }
  }
}
