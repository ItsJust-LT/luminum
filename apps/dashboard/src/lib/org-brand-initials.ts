/** Match Express `initialsFromOrgName` / `hueFromString` for PWA PNG avatars. */

export function initialsFromOrgName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) {
    const w = parts[0]!
    const letters = [...w].filter((c) => /\p{L}/u.test(c))
    if (letters.length >= 2) return (letters[0]! + letters[1]!).toUpperCase()
    if (letters.length === 1) return letters[0]!.toUpperCase()
    return w.slice(0, 2).toUpperCase()
  }
  const a = [...parts[0]!].find((c) => /\p{L}/u.test(c)) ?? parts[0]![0]!
  const b =
    [...parts[parts.length - 1]!].find((c) => /\p{L}/u.test(c)) ??
    parts[parts.length - 1]![0]!
  return (a + b).toUpperCase()
}

export function hueFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

export function isRasterImageUrl(url: string): boolean {
  const u = url.split("?")[0]?.toLowerCase() || ""
  if (u.startsWith("data:image/png") || u.startsWith("data:image/jpeg") || u.startsWith("data:image/webp"))
    return true
  return /\.(png|jpe?g|webp|gif)$/i.test(u)
}

export function isSvgImageUrl(url: string): boolean {
  const u = url.split("?")[0]?.toLowerCase() || ""
  if (u.startsWith("data:image/svg")) return true
  return u.endsWith(".svg")
}
