/**
 * Storage key namespaces. All organization-owned files live under:
 *   org/{organizationId}/images/logos/     — logos and org images
 *   org/{organizationId}/attachments/support/ — support ticket attachments
 *   org/{organizationId}/attachments/emails/   — email attachments
 *   org/{organizationId}/attachments/forms/   — form uploads (future)
 *
 * Legacy keys (no org prefix) are still supported for backward compatibility:
 *   logos/, support/, emails/, files/
 */

export const NS = {
  LOGOS: "logos",
  SUPPORT: "support",
  EMAILS: "emails",
  FILES: "files",
} as const;

const ORG_PREFIX = "org";
const ORG_IMAGES = "images";
const ORG_IMAGES_LOGOS = "logos";
const ORG_ATTACHMENTS = "attachments";
const ORG_ATTACHMENTS_SUPPORT = "support";
const ORG_ATTACHMENTS_EMAILS = "emails";
const ORG_ATTACHMENTS_FORMS = "forms";
const ORG_BLOG = "blog";

/** Prefix for all keys belonging to an organization (e.g. "org/abc123"). */
export function orgPrefix(organizationId: string): string {
  return `${ORG_PREFIX}/${organizationId}`;
}

/** Organization logo/image: org/{orgId}/images/logos/{timestamp}.{ext} */
export function orgImagesKey(organizationId: string, ext: string): string {
  const safe = (ext || "png").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10);
  return `${orgPrefix(organizationId)}/${ORG_IMAGES}/${ORG_IMAGES_LOGOS}/${Date.now()}.${safe}`;
}

/** Support attachment: org/{orgId}/attachments/support/{ticketId}/{messageId?-}{timestamp}-{filename} */
export function orgAttachmentsSupportKey(
  organizationId: string,
  ticketId: string,
  messageId: string | null,
  filename: string
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const part = messageId ? `${messageId}-${Date.now()}` : `${Date.now()}`;
  return `${orgPrefix(organizationId)}/${ORG_ATTACHMENTS}/${ORG_ATTACHMENTS_SUPPORT}/${ticketId}/${part}-${safe}`;
}

/** Email attachment: org/{orgId}/attachments/emails/{emailId}/{attachmentId}-{filename} */
export function orgAttachmentsEmailsKey(
  organizationId: string,
  emailId: string,
  attachmentId: string,
  filename: string
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return `${orgPrefix(organizationId)}/${ORG_ATTACHMENTS}/${ORG_ATTACHMENTS_EMAILS}/${emailId}/${attachmentId}-${safe}`;
}

/** Form attachment (future): org/{orgId}/attachments/forms/{formId}/{timestamp}-{filename} */
export function orgAttachmentsFormsKey(
  organizationId: string,
  formId: string,
  filename: string
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return `${orgPrefix(organizationId)}/${ORG_ATTACHMENTS}/${ORG_ATTACHMENTS_FORMS}/${formId}/${Date.now()}-${safe}`;
}

/**
 * Blog asset (cover or in-post): org/{orgId}/blog/{scope}/{timestamp}-{filename}
 * scope = post id for attached assets, or "draft" for pre-publish uploads.
 */
export function orgBlogAssetKey(
  organizationId: string,
  scope: string,
  filename: string
): string {
  const safeScope = (scope || "draft").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return `${orgPrefix(organizationId)}/${ORG_BLOG}/${safeScope}/${Date.now()}-${safe}`;
}

/** Prefix for org blog assets: org/{orgId}/blog/ */
export function orgBlogKeyPrefix(organizationId: string): string {
  return `${orgPrefix(organizationId)}/${ORG_BLOG}/`;
}

/** Whether key is under org blog namespace (org/{id}/blog/...). */
export function isOrgBlogKey(organizationId: string, key: string): boolean {
  return key.startsWith(orgBlogKeyPrefix(organizationId));
}

/** Whether a key is under the org-scoped prefix (org/{id}/...). */
export function isOrgScopedKey(key: string): boolean {
  return key.startsWith(`${ORG_PREFIX}/`);
}

/** Parse organization id from an org-scoped key; returns null if not org-scoped. */
export function getOrganizationIdFromKey(key: string): string | null {
  if (!key.startsWith(`${ORG_PREFIX}/`)) return null;
  const parts = key.split("/");
  if (parts.length < 2) return null;
  return parts[1] || null;
}

// ─── Legacy key helpers (backward compatibility) ─────────────────────────────

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
