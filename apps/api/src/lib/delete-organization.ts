/**
 * Permanently remove an organization: WhatsApp clients/data, object storage, Redis blog cache, then DB cascades.
 */
import { prisma } from "./prisma.js";
import { cacheDel, cacheDelByPrefix } from "./redis-cache.js";
import { orgPrefix } from "./storage/keys.js";
import { isStorageConfigured, listObjectsByPrefix, remove } from "./storage/s3.js";

const FILES_PREFIX = "/api/files/";

function keyFromProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(FILES_PREFIX);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + FILES_PREFIX.length));
  } catch {
    return null;
  }
}

async function collectStorageKeys(organizationId: string): Promise<Set<string>> {
  const keys = new Set<string>();

  const prefix = `${orgPrefix(organizationId)}/`;
  if (isStorageConfigured()) {
    try {
      const listed = await listObjectsByPrefix(prefix);
      for (const o of listed) keys.add(o.key);
    } catch (err) {
      console.error("listObjectsByPrefix failed for org delete:", organizationId, err);
    }
  }

  const attachments = await prisma.attachment.findMany({
    where: { email: { organization_id: organizationId } },
    select: { r2Key: true },
  });
  for (const a of attachments) keys.add(a.r2Key);

  const blogAssets = await prisma.blog_asset.findMany({
    where: { organization_id: organizationId },
    select: { s3_key: true },
  });
  for (const b of blogAssets) keys.add(b.s3_key);

  const posts = await prisma.blog_post.findMany({
    where: { organization_id: organizationId },
    select: { cover_image_key: true },
  });
  for (const p of posts) {
    if (p.cover_image_key?.trim()) keys.add(p.cover_image_key.trim());
  }

  const invoices = await prisma.invoice.findMany({
    where: { organization_id: organizationId },
    select: { pdf_storage_key: true, company_logo: true },
  });
  for (const inv of invoices) {
    if (inv.pdf_storage_key) keys.add(inv.pdf_storage_key);
    const logoKey = keyFromProxyUrl(inv.company_logo);
    if (logoKey) keys.add(logoKey);
  }

  const supportRows = await prisma.support_attachments.findMany({
    where: {
      storage_key: { not: null },
      support_tickets: { organization_id: organizationId },
    },
    select: { storage_key: true },
  });
  for (const s of supportRows) {
    if (s.storage_key) keys.add(s.storage_key);
  }

  const imageRows = await prisma.images.findMany({
    where: { organization_id: organizationId },
    select: { url: true },
  });
  for (const img of imageRows) {
    const k = keyFromProxyUrl(img.url);
    if (k) keys.add(k);
  }

  return keys;
}

export async function permanentlyDeleteOrganization(organizationId: string): Promise<{ name: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, logo: true, custom_domain: true },
  });
  if (!org) throw new Error("Organization not found");

  const { removeAccount } = await import("../whatsapp/manager.js");
  await removeAccount(organizationId).catch((err) => {
    console.error("WhatsApp cleanup for org delete:", organizationId, err);
  });

  if (isStorageConfigured()) {
    const keys = await collectStorageKeys(organizationId);
    const logoKey = keyFromProxyUrl(org.logo);
    if (logoKey) keys.add(logoKey);
    for (const key of keys) {
      await remove(key);
    }
  }

  if (org.custom_domain) {
    await cacheDel(`domain-lookup:${org.custom_domain}`);
  }

  await cacheDelByPrefix(`blog:pub:${organizationId}:`);
  await cacheDelByPrefix(`blog:draft:${organizationId}:`);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { primary_subscription_id: null },
  });

  await prisma.organization.delete({ where: { id: organizationId } });

  return { name: org.name };
}
