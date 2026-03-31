import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** Stored when no master key; not encrypted, only base64-wrapped (DB still holds sensitive data). */
const PLAINTEXT_STORE_PREFIX = "luminum-p1:";

/** Trim whitespace, strip one pair of surrounding quotes (common .env mistake). */
function normalizeKeyEnv(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function getMasterKey(): Buffer | null {
  const hex = normalizeKeyEnv(process.env.LUMINUM_EMAIL_SECRETS_KEY || "");
  if (!hex) return null;
  try {
    const buf = Buffer.from(hex, "hex");
    if (buf.length !== 32) return null;
    return buf;
  } catch {
    return null;
  }
}

export function isEmailSecretsKeyConfigured(): boolean {
  return getMasterKey() !== null;
}

/**
 * Why the server rejects the key (for setup-status UX). Does not expose the secret.
 */
export function getEmailSecretsKeyIssue(): "ok" | "unset" | "invalid_format" {
  const raw = normalizeKeyEnv(process.env.LUMINUM_EMAIL_SECRETS_KEY || "");
  if (!raw) return "unset";
  try {
    const buf = Buffer.from(raw, "hex");
    if (buf.length !== 32) return "invalid_format";
    return "ok";
  } catch {
    return "invalid_format";
  }
}

/**
 * Encrypt UTF-8 plaintext with AES-256-GCM when LUMINUM_EMAIL_SECRETS_KEY is set.
 * Otherwise stores a prefixed base64 UTF-8 blob (no encryption — allows dev/small deploys to proceed).
 */
export function encryptEmailSecret(plaintext: string): string {
  const key = getMasterKey();
  if (!key) {
    return PLAINTEXT_STORE_PREFIX + Buffer.from(plaintext, "utf8").toString("base64");
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptEmailSecret(blob: string): string {
  if (blob.startsWith(PLAINTEXT_STORE_PREFIX)) {
    const b64 = blob.slice(PLAINTEXT_STORE_PREFIX.length);
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const key = getMasterKey();
  if (!key) {
    throw new Error(
      "This secret was saved with encryption; set LUMINUM_EMAIL_SECRETS_KEY to the same 64-hex key used when it was saved.",
    );
  }
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("Invalid ciphertext");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
