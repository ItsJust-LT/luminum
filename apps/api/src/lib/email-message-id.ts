/** RFC 5322 Message-ID normalization for threading (trim, angle brackets, lowercase local+domain). */

function stripNul(s: string): string {
  return s.includes("\0") ? s.replace(/\u0000/g, "") : s;
}

/**
 * Normalize a single Message-ID for storage and matching.
 * Returns `<local@host>` lowercased or null if not parseable.
 */
export function normalizeMessageIdForStorage(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = stripNul(String(raw)).trim();
  const tokens = t.split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    const inner = tok.replace(/^<+/, "").replace(/>+$/, "").trim().toLowerCase();
    if (inner.includes("@") && inner.length > 3 && !inner.includes(" ")) {
      return `<${inner}>`;
    }
  }
  return null;
}

/** Normalize a References header (space-separated Message-IDs). */
export function normalizeReferencesForStorage(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const parts = stripNul(String(raw))
    .trim()
    .split(/\s+/)
    .map((p) => normalizeMessageIdForStorage(p))
    .filter((x): x is string => Boolean(x));
  return parts.length ? parts.join(" ") : null;
}

/**
 * Read a mail header from Resend / webhook shapes: plain object, or array of { name, value }.
 */
export function pickMailHeader(headers: unknown, headerName: string): string | undefined {
  if (headers == null) return undefined;
  const want = headerName.toLowerCase().trim();
  if (Array.isArray(headers)) {
    for (const row of headers) {
      if (!row || typeof row !== "object") continue;
      const o = row as { name?: unknown; value?: unknown };
      const n = typeof o.name === "string" ? o.name.toLowerCase().trim() : "";
      if (n === want) {
        const v = o.value;
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
    return undefined;
  }
  if (typeof headers === "object") {
    const h = headers as Record<string, unknown>;
    for (const [k, v] of Object.entries(h)) {
      if (k.toLowerCase().trim() !== want) continue;
      if (typeof v === "string" && v.trim()) return v.trim();
      if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) return v[0].trim();
    }
  }
  return undefined;
}
