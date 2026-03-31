/**
 * websites.id in Luminum is a UUID; analytics / blog APIs require the same value.
 */

/** Matches PostgreSQL uuid text form (websites.id). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeWebsiteId(id: string): string {
  return id.trim().toLowerCase();
}

export function isValidWebsiteId(id: string): boolean {
  return UUID_RE.test(normalizeWebsiteId(id));
}

export function assertWebsiteId(
  id: string | undefined | null,
  context: string,
): asserts id is string {
  const t = typeof id === "string" ? id.trim() : "";
  if (!t) {
    throw new Error(
      `[@itsjust-lt/website-kit] ${context}: websiteId is required. Set NEXT_PUBLIC_LUMINUM_WEBSITE_ID (and usually LUMINUM_WEBSITE_ID for server code) to your Website ID from the Luminum dashboard.`,
    );
  }
  if (!isValidWebsiteId(t)) {
    throw new Error(
      `[@itsjust-lt/website-kit] ${context}: websiteId must be a UUID (the Website ID from your Luminum project).`,
    );
  }
}

/**
 * Call from next.config.ts after loading env so `next build` fails when the public ID is missing or invalid.
 *
 * @example
 * ```ts
 * import { loadEnvConfig } from "@next/env";
 * import { assertLuminumWebsiteIdsAtBuild } from "@itsjust-lt/website-kit/env";
 * const projectDir = process.cwd();
 * loadEnvConfig(projectDir);
 * assertLuminumWebsiteIdsAtBuild();
 * ```
 */
export function assertLuminumWebsiteIdsAtBuild(): void {
  if (process.env.SKIP_LUMINUM_WEBSITE_ID_CHECK === "1") return;

  assertWebsiteId(
    process.env.NEXT_PUBLIC_LUMINUM_WEBSITE_ID,
    "Build (NEXT_PUBLIC_LUMINUM_WEBSITE_ID)",
  );
  const pub = normalizeWebsiteId(process.env.NEXT_PUBLIC_LUMINUM_WEBSITE_ID!);
  const serverRaw = process.env.LUMINUM_WEBSITE_ID?.trim();
  if (serverRaw && normalizeWebsiteId(serverRaw) !== pub) {
    throw new Error(
      "[@itsjust-lt/website-kit] LUMINUM_WEBSITE_ID must match NEXT_PUBLIC_LUMINUM_WEBSITE_ID when both are set.",
    );
  }
}
