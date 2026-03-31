import { OUTBOUND_MAX_ATTACHMENT_BYTES } from "./resend-org.js";

export type OutboundAttachment = { filename: string; contentType: string; contentBase64: string };

const MAX_ATTACHMENTS = 10;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Normalize and validate attachments from API JSON (send / schedule / reply). */
export function normalizeAttachmentsFromRequest(
  attachmentsInput: unknown
): OutboundAttachment[] {
  if (!Array.isArray(attachmentsInput) || attachmentsInput.length === 0) return [];
  const out: OutboundAttachment[] = [];
  for (const raw of attachmentsInput.slice(0, MAX_ATTACHMENTS)) {
    if (!isPlainObject(raw)) continue;
    const filename = typeof raw.filename === "string" ? raw.filename.trim() : "";
    const contentType = typeof raw.contentType === "string" ? raw.contentType.trim() : "";
    const contentBase64 = typeof raw.contentBase64 === "string" ? raw.contentBase64.trim() : "";
    if (!filename || !contentType || !contentBase64) continue;
    if (filename.length > 255) continue;
    let buf: Buffer;
    try {
      buf = Buffer.from(contentBase64, "base64");
    } catch {
      continue;
    }
    if (!buf.length || buf.length > OUTBOUND_MAX_ATTACHMENT_BYTES) continue;
    out.push({ filename, contentType, contentBase64 });
  }
  return out;
}

/** Parse pending attachments stored on a scheduled email row (skips invalid entries). */
export function parsePendingAttachmentsFromDb(value: unknown): OutboundAttachment[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  const out: OutboundAttachment[] = [];
  for (const raw of value.slice(0, MAX_ATTACHMENTS)) {
    if (!isPlainObject(raw)) continue;
    const filename = typeof raw.filename === "string" ? raw.filename.trim() : "";
    const contentType = typeof raw.contentType === "string" ? raw.contentType.trim() : "";
    const contentBase64 = typeof raw.contentBase64 === "string" ? raw.contentBase64.trim() : "";
    if (!filename || !contentType || !contentBase64) continue;
    let buf: Buffer;
    try {
      buf = Buffer.from(contentBase64, "base64");
    } catch {
      continue;
    }
    if (!buf.length || buf.length > OUTBOUND_MAX_ATTACHMENT_BYTES) continue;
    out.push({ filename, contentType, contentBase64 });
  }
  return out;
}
