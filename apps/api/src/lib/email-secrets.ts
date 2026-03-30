import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getMasterKey(): Buffer | null {
  const hex = (process.env.LUMINUM_EMAIL_SECRETS_KEY || "").trim();
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

/** Encrypt UTF-8 plaintext; returns base64(iv+tag+ciphertext). */
export function encryptEmailSecret(plaintext: string): string {
  const key = getMasterKey();
  if (!key) throw new Error("LUMINUM_EMAIL_SECRETS_KEY is not set (64 hex chars = 32 bytes)");
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptEmailSecret(blob: string): string {
  const key = getMasterKey();
  if (!key) throw new Error("LUMINUM_EMAIL_SECRETS_KEY is not set");
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("Invalid ciphertext");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
