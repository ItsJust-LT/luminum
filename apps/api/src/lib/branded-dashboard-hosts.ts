import { prisma } from "./prisma.js";
import { config } from "../config.js";

function hostnamesFromOrigins(origins: readonly string[]): string[] {
  const hosts: string[] = [];
  for (const o of origins) {
    try {
      hosts.push(new URL(o).hostname);
    } catch {
      /* skip */
    }
  }
  return [...new Set(hosts)];
}

/** Static patterns + env CORS hosts. Branded verified domains are appended by `syncBrandedDashboardAllowedHosts`. */
function buildStaticAuthAllowedHosts(): string[] {
  return [
    "api.luminum.agency",
    "app.luminum.agency",
    "*.luminum.agency",
    "localhost",
    "localhost:3000",
    "localhost:4000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "127.0.0.1:4000",
    ...hostnamesFromOrigins(config.corsOrigin),
  ];
}

/**
 * Mutated in place so Better Auth keeps using the same array reference while
 * `allowedHosts` grows with verified branded dashboard domains.
 */
export const authAllowedHostsMutable: string[] = buildStaticAuthAllowedHosts();

const originHostnameCache = new Map<string, { ok: boolean; expires: number }>();
const ORIGIN_CACHE_TTL_MS = 120_000;

export function invalidateBrandedOriginCache(hostname?: string): void {
  if (hostname) {
    originHostnameCache.delete(hostname.toLowerCase());
    return;
  }
  originHostnameCache.clear();
}

export async function isBrandedVerifiedHostname(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase();
  const now = Date.now();
  const hit = originHostnameCache.get(h);
  if (hit && hit.expires > now) return hit.ok;

  const org = await prisma.organization.findFirst({
    where: {
      custom_domain: h,
      branded_dashboard_enabled: true,
      custom_domain_verified: true,
    },
    select: { id: true },
  });
  const ok = !!org;
  originHostnameCache.set(h, { ok, expires: now + ORIGIN_CACHE_TTL_MS });
  return ok;
}

export async function isBrandedVerifiedOrigin(origin: string): Promise<boolean> {
  try {
    return await isBrandedVerifiedHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/** Reload Better Auth `allowedHosts` + clear CORS hostname cache from DB. Call after branded/domain changes. */
export async function syncBrandedDashboardAllowedHosts(): Promise<void> {
  const base = buildStaticAuthAllowedHosts();
  const rows = await prisma.organization.findMany({
    where: {
      branded_dashboard_enabled: true,
      custom_domain_verified: true,
      custom_domain: { not: null },
    },
    select: { custom_domain: true },
  });
  const extras = [
    ...new Set(
      rows
        .map((r) => r.custom_domain?.trim().toLowerCase())
        .filter((d): d is string => Boolean(d)),
    ),
  ];

  authAllowedHostsMutable.length = 0;
  authAllowedHostsMutable.push(...base);
  for (const d of extras) {
    if (!authAllowedHostsMutable.includes(d)) authAllowedHostsMutable.push(d);
  }
  invalidateBrandedOriginCache();
}
