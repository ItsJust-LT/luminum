import { prisma } from "./prisma.js";
import { cacheDel } from "./redis-cache.js";

/** Call after org logo/name/slug or domain fields change so branded host middleware sees fresh data. */
export async function invalidateDomainLookupCacheForOrganization(
  organizationId: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { custom_domain: true },
  });
  const d = org?.custom_domain?.trim().toLowerCase();
  if (d) await cacheDel(`domain-lookup:${d}`);
}
