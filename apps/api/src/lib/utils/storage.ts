import { prisma } from "../prisma.js";

export async function updateOrganizationStorage(
  organizationId: string,
  bytesDelta: number
): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { used_storage_bytes: true },
  });
  if (!organization) throw new Error("Organization not found");

  const currentBytes = organization.used_storage_bytes || BigInt(0);
  const newBytes = currentBytes + BigInt(bytesDelta);
  const finalBytes = newBytes < BigInt(0) ? BigInt(0) : newBytes;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { used_storage_bytes: finalBytes },
  });
}
