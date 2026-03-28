/**
 * Detect ZIP local header bytes inside a string's UTF-8 encoding (mis-stored DMARC / report zips in body).
 */
function findSubbytes(haystack: Uint8Array, needle: readonly number[]): number {
  if (needle.length === 0 || haystack.length < needle.length) return -1
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

export function utf8FieldContainsZipMagic(s: string | null | undefined): boolean {
  if (s == null || s === "") return false
  const u = new TextEncoder().encode(s)
  return (
    findSubbytes(u, [0x50, 0x4b, 0x03, 0x04]) >= 0 ||
    findSubbytes(u, [0x50, 0x4b, 0x05, 0x06]) >= 0
  )
}

export function emailBodyLikelyHasMisstoredZip(text: string | null, html: string | null): boolean {
  return utf8FieldContainsZipMagic(text) || utf8FieldContainsZipMagic(html)
}
