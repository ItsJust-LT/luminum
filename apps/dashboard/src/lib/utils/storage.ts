import { prisma } from "@/lib/prisma"

/**
 * Update organization storage usage
 * @param organizationId - The organization ID
 * @param bytesDelta - The change in bytes (positive for increase, negative for decrease)
 */
export async function updateOrganizationStorage(
  organizationId: string,
  bytesDelta: number
): Promise<void> {
  try {
    // Get current storage usage
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { used_storage_bytes: true },
    })

    if (!organization) {
      throw new Error("Organization not found")
    }

    const currentBytes = organization.used_storage_bytes || BigInt(0)
    const newBytes = currentBytes + BigInt(bytesDelta)

    // Ensure storage doesn't go negative
    const finalBytes = newBytes < BigInt(0) ? BigInt(0) : newBytes

    // Update organization storage
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        used_storage_bytes: finalBytes,
      },
    })
  } catch (error) {
    console.error("Error updating organization storage:", error)
    throw error
  }
}

