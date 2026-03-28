/**
 * Detect ZIP local file header (and common variants) in a UTF-8 string or buffer.
 */
export function bufferLooksLikeZip(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) return false; // PK
  const b2 = buf[2];
  const b3 = buf[3];
  return (
    (b2 === 0x03 && b3 === 0x04) || // local file
    (b2 === 0x05 && b3 === 0x06) || // empty archive
    (b2 === 0x07 && b3 === 0x08) // spanned
  );
}

export function utf8StringStartsWithZipMagic(s: string): boolean {
  const u = new TextEncoder().encode(s);
  return bufferLooksLikeZip(Buffer.from(u));
}

const SIG_LOCAL = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const SIG_EMPTY = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

function zipMagicOffsetInBuffer(buf: Buffer): number {
  let idx = buf.indexOf(SIG_LOCAL);
  if (idx >= 0) return idx;
  idx = buf.indexOf(SIG_EMPTY);
  return idx;
}

/** Find PK + local/empty header using UTF-16 code units (survives UTF-8 re-encoding of binary). */
function zipMagicOffsetByCharCode(s: string): number {
  const n = s.length;
  for (let i = 0; i <= n - 4; i++) {
    if (s.charCodeAt(i) !== 0x50 || s.charCodeAt(i + 1) !== 0x4b) continue;
    const b2 = s.charCodeAt(i + 2);
    const b3 = s.charCodeAt(i + 3);
    if (
      (b2 === 0x03 && b3 === 0x04) ||
      (b2 === 0x05 && b3 === 0x06) ||
      (b2 === 0x07 && b3 === 0x08)
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * If `s` contains a ZIP starting at the first PK\x03\x04 (etc.), return bytes from that offset to EOF
 * and any readable UTF-8 prefix before it.
 *
 * Tries UTF-8, then Latin-1 (common when binary was read as one byte per char), then a char-code scan.
 */
export function extractZipFromUtf8String(s: string): { zip: Buffer; prefix: string } | null {
  const tryBuf = (buf: Buffer): { zip: Buffer; prefix: string } | null => {
    const idx = zipMagicOffsetInBuffer(buf);
    if (idx < 0) return null;
    const zip = Buffer.from(buf.subarray(idx));
    if (!bufferLooksLikeZip(zip)) return null;
    const prefix =
      idx > 0 ? buf.subarray(0, idx).toString("utf8").replace(/[\s\u00a0]+$/u, "") : "";
    return { zip, prefix };
  };

  const utf8 = tryBuf(Buffer.from(s, "utf8"));
  if (utf8) return utf8;

  const latin1 = tryBuf(Buffer.from(s, "latin1"));
  if (latin1) return latin1;

  const idx = zipMagicOffsetByCharCode(s);
  if (idx < 0) return null;
  const zip = Buffer.from(s.slice(idx), "latin1");
  if (!bufferLooksLikeZip(zip)) return null;
  const prefix = s.slice(0, idx).replace(/[\s\u00a0]+$/u, "");
  return { zip, prefix };
}

export interface ExtractedZipPart {
  filename: string;
  contentType: string;
  buffer: Buffer;
  /** Human-readable prefix that was before the zip in the same field */
  prefix: string;
}

/**
 * Pull embedded ZIP blobs out of text/html fields (e.g. DMARC reports pasted into body by naive parsers).
 */
export function extractZipsFromBodies(text: string | null, html: string | null): {
  text: string | null;
  html: string | null;
  extracted: ExtractedZipPart[];
} {
  const extracted: ExtractedZipPart[] = [];
  let nextText = text;
  let nextHtml = html;

  const processField = (raw: string | null, field: "text" | "html"): string | null => {
    if (raw == null || raw === "") return raw;
    const hit = extractZipFromUtf8String(raw);
    if (!hit) return raw;
    const { zip, prefix } = hit;
    const idx = extracted.length;
    const name =
      field === "html" ? `embedded-report-${idx}.zip` : `dmarc-report-${idx}.zip`;
    extracted.push({
      filename: name,
      contentType: "application/zip",
      buffer: zip,
      prefix,
    });
    const replacement =
      prefix.trim().length > 0
        ? `${prefix}\n\n[Binary attachment extracted: ${name} — use Attachments to download.]`
        : `[DMARC or ZIP report attached as ${name} — open Attachments to download the .zip file.]`;
    return replacement;
  };

  nextText = processField(nextText, "text");
  nextHtml = processField(nextHtml, "html");

  return {
    text: nextText,
    html: nextHtml,
    extracted,
  };
}
