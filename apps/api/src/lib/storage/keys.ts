/**
 * Key namespaces for object storage. All keys live in one bucket.
 * - logos/: organization logos
 * - support/: support ticket/message attachments
 * - emails/: email attachments
 * - files/: future generic uploads
 */

export const NS = {
  LOGOS: "logos",
  SUPPORT: "support",
  EMAILS: "emails",
  FILES: "files",
} as const;

export function logoKey(organizationName: string, ext: string): string {
  const sanitized = (organizationName || "logo").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return `${NS.LOGOS}/${sanitized}-${Date.now()}.${ext}`;
}

export function supportKey(ticketId: string, messageId: string | null, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const prefix = messageId ? `${NS.SUPPORT}/${ticketId}/${messageId}` : `${NS.SUPPORT}/${ticketId}`;
  return `${prefix}-${Date.now()}-${safe}`;
}

export function emailAttachmentKey(emailId: string, attachmentId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${NS.EMAILS}/${emailId}/${attachmentId}-${safe}`;
}

export function fileKey(prefix: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${NS.FILES}/${prefix}/${Date.now()}-${safe}`;
}
