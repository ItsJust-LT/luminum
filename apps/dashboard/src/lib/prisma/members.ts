"use server"

import { serverGet } from "@/lib/api-server"

export async function getMembersByOrganization(organizationId: string) {
  return serverGet("/api/members", { organizationId })
}
