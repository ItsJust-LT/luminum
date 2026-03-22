/**
 * Read-only snapshot of process.env for admin dashboard.
 * Secrets are masked; keys mirror what production deploy writes from GitHub Actions + optional host .env.
 */

import { config } from "../config.js";

const DEPLOY_KEYS_ORDERED: string[] = [
  "NODE_ENV",
  "PORT",
  "EMAIL_SYSTEM_ENABLED",
  "APP_URL",
  "API_URL",
  "API_WS_URL",
  "CORS_ORIGINS",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_ANALYTICS_URL",
  "REGISTRY_IMAGE_PREFIX",
  "POSTGRES_USER",
  "POSTGRES_DB",
  "POSTGRES_PASSWORD",
  "DATABASE_URL",
  "REDIS_URL",
  "BETTER_AUTH_SECRET",
  "WEBHOOK_SECRET",
  "MAIL_APP_URL",
  "MAIL_APP_SECRET",
  "MAIL_FROM_DEFAULT",
  "MAIL_SEND_IP",
  "MAIL_MX_HOST",
  "MAIL_DKIM_DNS_VALUE",
  "MAIL_DKIM_SELECTOR",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "RESEND_API_KEY",
  "PAYSTACK_SECRET",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "S3_REGION",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "MINIO_ROOT_USER",
  "MINIO_ROOT_PASSWORD",
  "ANALYTICS_URL",
];

function isSensitiveKey(key: string): boolean {
  const u = key.toUpperCase();
  if (u.includes("SECRET")) return true;
  if (u.includes("PASSWORD")) return true;
  if (u.includes("PRIVATE")) return true;
  if (u.endsWith("_KEY") && !u.includes("PUBLIC")) return true;
  if (u.includes("TOKEN")) return true;
  if (u === "DATABASE_URL" || u === "REDIS_URL") return true;
  if (u.includes("DKIM_DNS_VALUE")) return true;
  return false;
}

function maskValue(raw: string | undefined): { display: string; masked: boolean } {
  if (raw === undefined || raw === "") return { display: "(not set)", masked: false };
  return { display: "••••••••", masked: true };
}

export interface AdminEnvEntry {
  key: string;
  value: string;
  masked: boolean;
}

export interface AdminEnvDerived {
  /** Origins the API actually allows (see config.corsOrigin). */
  corsOriginsEffective: string[];
  /** How CORS was resolved — env var vs fallback. */
  corsOriginsResolvedFrom: string;
  /** True if CORS_ORIGINS was non-empty in process.env. */
  corsOriginsEnvSet: boolean;
}

function entryForKey(key: string): AdminEnvEntry {
  const raw = process.env[key];
  const sensitive = isSensitiveKey(key);
  if (sensitive && raw !== undefined && raw !== "") {
    const m = maskValue(raw);
    return { key, value: m.display, masked: m.masked };
  }
  return {
    key,
    value: raw === undefined || raw === "" ? "(not set)" : raw,
    masked: false,
  };
}

const ADDITIONAL_ENV_MAX = 200;

export function getAdminSystemEnvironmentSnapshot(): {
  entries: AdminEnvEntry[];
  additionalEntries: AdminEnvEntry[];
  additionalTruncated: boolean;
  sourceNote: string;
  githubDeployNote: string;
  derived: AdminEnvDerived;
} {
  const entries: AdminEnvEntry[] = DEPLOY_KEYS_ORDERED.map((key) => entryForKey(key));

  const known = new Set(DEPLOY_KEYS_ORDERED);
  const extraKeys = Object.keys(process.env)
    .filter((k) => !known.has(k) && !k.startsWith("npm_") && k !== "PATH")
    .sort((a, b) => a.localeCompare(b));
  const additionalTruncated = extraKeys.length > ADDITIONAL_ENV_MAX;
  const additionalEntries = extraKeys.slice(0, ADDITIONAL_ENV_MAX).map((key) => entryForKey(key));

  const sourceNote =
    "Values are from the API process environment at runtime (typically docker-compose .env on the server, often generated from GitHub Actions secrets and variables during deploy). Editing is not supported here. Some rows show “(not set)” but the app still applies defaults (see Effective configuration below).";

  const githubDeployNote =
    "GitHub Repository secrets/variables are often named with a PROD_ prefix (e.g. PROD_API_BETTER_AUTH_SECRET). The deploy workflow maps them to different names in the server .env (e.g. BETTER_AUTH_SECRET). The dashboard shows runtime names only. A secret will not appear unless (1) it is referenced in the deploy workflow step that writes .env, and (2) that variable is passed into the API container (e.g. via docker-compose env_file / environment).";

  const corsEnv = process.env.CORS_ORIGINS?.trim();
  const derived: AdminEnvDerived = {
    corsOriginsEffective: [...config.corsOrigin],
    corsOriginsResolvedFrom: corsEnv
      ? "CORS_ORIGINS"
      : "APP_URL and/or NEXT_PUBLIC_APP_URL (CORS_ORIGINS was unset — same logic as config.ts)",
    corsOriginsEnvSet: Boolean(corsEnv),
  };

  return { entries, additionalEntries, additionalTruncated, sourceNote, githubDeployNote, derived };
}
