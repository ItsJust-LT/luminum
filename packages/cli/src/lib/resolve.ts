import type { PrismaClient } from "@luminum/database";

export async function resolveUser(prisma: PrismaClient, identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  const isEmail = normalized.includes("@");

  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: normalized } })
    : await prisma.user.findUnique({ where: { id: identifier } });

  if (!user) {
    console.error(`No user found: ${identifier}`);
    process.exitCode = 1;
    return null;
  }
  return user;
}

export async function resolveOrg(prisma: PrismaClient, identifier: string) {
  let org = await prisma.organization.findUnique({ where: { id: identifier } });
  if (!org) {
    org = await prisma.organization.findUnique({ where: { slug: identifier } });
  }
  if (!org) {
    console.error(`No organization found: ${identifier}`);
    process.exitCode = 1;
    return null;
  }
  return org;
}

export async function resolveWebsite(prisma: PrismaClient, identifier: string) {
  let website = await prisma.websites.findUnique({ where: { id: identifier } }).catch(() => null);
  if (!website) {
    website = await prisma.websites.findUnique({ where: { domain: identifier } });
  }
  if (!website) {
    console.error(`No website found: ${identifier}`);
    process.exitCode = 1;
    return null;
  }
  return website;
}
