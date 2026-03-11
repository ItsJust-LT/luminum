"use server"

import { serverGet, serverPatch, serverDelete } from "@/lib/api-server"

export async function getOrganizationDetails(organizationId: string) {
  return serverGet("/api/organization-management", { organizationId })
}

export async function updateOrganization(organizationId: string, data: any) {
  return serverPatch(`/api/organization-management?organizationId=${organizationId}`, data)
}

export async function deleteOrganization(organizationId: string) {
  return serverDelete(`/api/organization-management?organizationId=${organizationId}`)
}

export async function getOrganizationStats() {
  return serverGet("/api/organization-management/stats")
}
