/**
 * Normalize referrer host for grouping (empty / null = direct traffic).
 */
export function normalizeReferrerDomain(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  return s || "(direct)";
}

export type ReferrerTrafficKind =
  | "direct"
  | "search"
  | "social"
  | "email"
  | "campaign"
  | "referral";

export function trafficKindFromStored(
  trafficSource: string | null | undefined,
  domainKey: string,
): ReferrerTrafficKind {
  if (domainKey === "(direct)") return "direct";
  const ts = (trafficSource ?? "").toLowerCase();
  if (ts === "utm") return "campaign";
  if (ts === "direct") return "direct";
  if (ts === "search") return "search";
  if (ts === "social") return "social";
  if (ts === "email") return "email";
  if (ts === "referral") return "referral";
  return inferKindFromDomain(domainKey);
}

function inferKindFromDomain(domain: string): ReferrerTrafficKind {
  const d = domain.toLowerCase();
  const engines = ["google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex."];
  if (engines.some((e) => d.includes(e))) return "search";
  const social = [
    "facebook.",
    "twitter.",
    "t.co",
    "instagram.",
    "linkedin.",
    "pinterest.",
    "tiktok.",
    "youtube.",
    "reddit.",
  ];
  if (social.some((s) => d.includes(s))) return "social";
  if (d.includes("mail.") || d.includes("email.") || d.includes("newsletter."))
    return "email";
  return "referral";
}

/** Human-readable primary label (brand when known, else hostname). */
export function displayLabelForReferrerDomain(domainKey: string): string {
  if (domainKey === "(direct)") return "Direct";

  const d = domainKey.toLowerCase();

  const brands: [RegExp, string][] = [
    [/google\./i, "Google"],
    [/bing\./i, "Bing"],
    [/yahoo\./i, "Yahoo"],
    [/duckduckgo\./i, "DuckDuckGo"],
    [/baidu\./i, "Baidu"],
    [/yandex\./i, "Yandex"],
    [/facebook\./i, "Facebook"],
    [/m\.facebook\./i, "Facebook"],
    [/twitter\./i, "X (Twitter)"],
    [/t\.co$/i, "X (Twitter)"],
    [/x\.com$/i, "X (Twitter)"],
    [/instagram\./i, "Instagram"],
    [/linkedin\./i, "LinkedIn"],
    [/pinterest\./i, "Pinterest"],
    [/tiktok\./i, "TikTok"],
    [/youtube\./i, "YouTube"],
    [/youtu\.be$/i, "YouTube"],
    [/reddit\./i, "Reddit"],
  ];

  for (const [re, name] of brands) {
    if (re.test(d)) return name;
  }

  return domainKey.replace(/^www\./i, "");
}

export function kindLabel(kind: ReferrerTrafficKind): string {
  switch (kind) {
    case "direct":
      return "Direct";
    case "search":
      return "Search";
    case "social":
      return "Social";
    case "email":
      return "Email";
    case "campaign":
      return "Campaign";
    default:
      return "Referral";
  }
}

/** Host for Google's favicon service (no scheme/path). */
export function faviconHostForDomainKey(domainKey: string): string | null {
  if (domainKey === "(direct)") return null;
  return domainKey.replace(/^www\./i, "");
}

export function googleFaviconUrl(host: string, size = 32): string {
  const q = encodeURIComponent(host);
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${q}`;
}
