/** Two-letter (or shorter) initials for org branding when no logo is uploaded. */
export function initialsFromOrgName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0]!;
    const letters = [...w].filter((c) => /\p{L}/u.test(c));
    if (letters.length >= 2) return (letters[0]! + letters[1]!).toUpperCase();
    if (letters.length === 1) return letters[0]!.toUpperCase();
    return w.slice(0, 2).toUpperCase();
  }
  const a = [...parts[0]!].find((c) => /\p{L}/u.test(c)) ?? parts[0]![0]!;
  const b =
    [...parts[parts.length - 1]!].find((c) => /\p{L}/u.test(c)) ?? parts[parts.length - 1]![0]!;
  return (a + b).toUpperCase();
}

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Square SVG avatar with initials (for favicons, push, login fallback). */
export function orgBrandSvg(initials: string): string {
  const safe = escapeXml(initials.replace(/\s/g, "").slice(0, 3) || "?");
  const hue = hueFromString(initials);
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect fill="hsl(${hue} 45% 40%)" width="128" height="128" rx="28"/><text x="64" y="64" dominant-baseline="central" text-anchor="middle" fill="white" font-family="system-ui,Segoe UI,sans-serif" font-size="52" font-weight="600">${safe}</text></svg>`;
}
