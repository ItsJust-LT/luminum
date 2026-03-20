/** Parsed organization.metadata JSON fields used for public blog SEO. */
export type OrgPublicMeta = {
  publicBaseUrl?: string;
  baseUrl?: string;
  siteUrl?: string;
};

export function parseOrganizationMetadata(metadata: string | null | undefined): OrgPublicMeta {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as OrgPublicMeta;
  } catch {
    return {};
  }
}

export function getOrgPublicSiteBase(metadata: string | null | undefined): string | null {
  const m = parseOrganizationMetadata(metadata);
  const raw = m.publicBaseUrl ?? m.baseUrl ?? m.siteUrl;
  if (!raw || typeof raw !== "string") return null;
  return raw.replace(/\/$/, "");
}
