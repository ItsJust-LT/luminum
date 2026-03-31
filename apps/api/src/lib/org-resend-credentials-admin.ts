import { prisma } from "./prisma.js";
import { encryptEmailSecret, isEmailSecretsKeyConfigured } from "./email-secrets.js";
import { validateOrgResendDomain } from "./resend-org.js";

export type PatchOrgResendInput = {
  apiKey?: string;
  webhookSecret?: string;
};

/**
 * Platform-admin updates to Resend credentials. Either or both fields may be set.
 * API key updates run Resend domain validation; webhook-only updates require an existing API key.
 */
export async function patchOrganizationResendCredentials(
  organizationId: string,
  input: PatchOrgResendInput
): Promise<
  | { ok: true; message: string; storedEncrypted: boolean }
  | { ok: false; error: string; status: number }
> {
  const apiKeyRaw = input.apiKey;
  const webhookRaw = input.webhookSecret;
  const apiKey = typeof apiKeyRaw === "string" ? apiKeyRaw.trim() : undefined;
  const webhookSecret = typeof webhookRaw === "string" ? webhookRaw.trim() : undefined;

  if (apiKey === undefined && webhookSecret === undefined) {
    return { ok: false, status: 400, error: "Provide apiKey and/or webhookSecret" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      resend_api_key_ciphertext: true,
      resend_webhook_secret_ciphertext: true,
      email_domain_id: true,
      email_domain: { select: { domain: true } },
    },
  });

  if (!org) return { ok: false, status: 404, error: "Organization not found" };
  if (!org.email_domain_id || !org.email_domain?.domain) {
    return {
      ok: false,
      status: 400,
      error: "Link an email domain first (workspace Email page or set website domain for this organization).",
    };
  }
  const domain = org.email_domain.domain;

  let nextKeyEnc = org.resend_api_key_ciphertext;
  let nextWhEnc = org.resend_webhook_secret_ciphertext;
  const now = new Date();

  if (apiKey !== undefined) {
    if (!apiKey.startsWith("re_") || apiKey.length < 10) {
      return { ok: false, status: 400, error: "Invalid Resend API key format" };
    }
    const check = await validateOrgResendDomain(apiKey, domain);
    if (!check.ok) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { resend_last_error: check.error ?? "validation failed", resend_last_validated_at: now },
      });
      return { ok: false, status: 400, error: check.error ?? "Resend validation failed" };
    }
    nextKeyEnc = encryptEmailSecret(apiKey);
  }

  if (webhookSecret !== undefined) {
    if (webhookSecret.length < 8) {
      return {
        ok: false,
        status: 400,
        error: "Webhook signing secret is too short (paste the full secret from Resend → Webhooks).",
      };
    }
    const effectiveKey = nextKeyEnc ?? org.resend_api_key_ciphertext;
    if (!effectiveKey) {
      return { ok: false, status: 400, error: "Save a Resend API key before setting the webhook signing secret." };
    }
    nextWhEnc = encryptEmailSecret(webhookSecret);
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      resend_api_key_ciphertext: nextKeyEnc,
      resend_webhook_secret_ciphertext: nextWhEnc,
      resend_last_validated_at: now,
      resend_last_error: null,
      ...(apiKey !== undefined
        ? { email_dns_verified_at: now, email_dns_last_error: null }
        : {}),
    },
  });

  const encrypted = isEmailSecretsKeyConfigured();
  let message = "Saved.";
  if (apiKey !== undefined && webhookSecret !== undefined) {
    message =
      "API key and webhook secret saved. Add the inbound webhook URL in Resend (event email.received) if you have not already.";
  } else if (apiKey !== undefined) {
    message = "API key saved and domain validated in Resend.";
  } else {
    message = "Webhook signing secret saved.";
  }
  if (!encrypted) {
    message += " Set LUMINUM_EMAIL_SECRETS_KEY (64 hex chars) on the API for AES encryption at rest.";
  }

  return { ok: true, message, storedEncrypted: encrypted };
}

export async function clearOrganizationResendCredentials(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
  if (!org) return false;
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      resend_api_key_ciphertext: null,
      resend_webhook_secret_ciphertext: null,
      resend_last_validated_at: null,
      resend_last_error: null,
      email_dns_verified_at: null,
    },
  });
  return true;
}
