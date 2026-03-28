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

/**
 * If `s` contains a ZIP starting at the first PK\x03\x04 (etc.), return bytes from that offset to EOF
 * and any readable UTF-8 prefix before it.
 */
export function extractZipFromUtf8String(s: string): { zip: Buffer; prefix: string } | null {
  const buf = Buffer.from(s, "utf8");
  const sig = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  let idx = buf.indexOf(sig);
  if (idx < 0) {
    const sigEmpty = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
    idx = buf.indexOf(sigEmpty);
  }
  if (idx < 0) return null;
  const zip = Buffer.from(buf.subarray(idx));
  if (!bufferLooksLikeZip(zip)) return null;
  const prefix = idx > 0 ? buf.subarray(0, idx).toString("utf8").replace(/[\s\u00a0]+$/u, "") : "";
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
