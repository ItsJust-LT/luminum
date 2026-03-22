/**
 * Platform-wide email (org inbox + send via mail app). When disabled, org UI shows a generic message;
 * admins see details via /api/admin/email-system-status and system environment.
 */
export function isEmailSystemEnabled(): boolean {
  const v = process.env.EMAIL_SYSTEM_ENABLED?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return true;
}

/** User-facing copy when EMAIL_SYSTEM_ENABLED is false */
export const EMAIL_SYSTEM_UNAVAILABLE_MESSAGE =
  "Email is not available at this time. Please try again later or contact support if you need assistance.";
