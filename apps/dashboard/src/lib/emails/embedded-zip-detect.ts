/**
 * Detect ZIP local header in mis-stored DMARC bodies. UTF-8 bytes often do not contain 0x03 0x04
 * after DB/JSON round-trips; Latin-1 and char-code scans match the Go/dashboard pipeline.
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

function latin1StringToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 0xff
  }
  return out
}

function charCodeHasZipMagicAt(s: string, i: number): boolean {
  if (s.charCodeAt(i) !== 0x50 || s.charCodeAt(i + 1) !== 0x4b) return false
  const b2 = s.charCodeAt(i + 2)
  const b3 = s.charCodeAt(i + 3)
  return (
    (b2 === 0x03 && b3 === 0x04) ||
    (b2 === 0x05 && b3 === 0x06) ||
    (b2 === 0x07 && b3 === 0x08)
  )
}

export function utf8FieldContainsZipMagic(s: string | null | undefined): boolean {
  if (s == null || s === "") return false
  const u = new TextEncoder().encode(s)
  if (
    findSubbytes(u, [0x50, 0x4b, 0x03, 0x04]) >= 0 ||
    findSubbytes(u, [0x50, 0x4b, 0x05, 0x06]) >= 0
  ) {
    return true
  }
  const l1 = latin1StringToBytes(s)
  if (
    findSubbytes(l1, [0x50, 0x4b, 0x03, 0x04]) >= 0 ||
    findSubbytes(l1, [0x50, 0x4b, 0x05, 0x06]) >= 0
  ) {
    return true
  }
  for (let i = 0; i <= s.length - 4; i++) {
    if (charCodeHasZipMagicAt(s, i)) return true
  }
  return false
}

export function emailBodyLikelyHasMisstoredZip(text: string | null, html: string | null): boolean {
  return utf8FieldContainsZipMagic(text) || utf8FieldContainsZipMagic(html)
}
