"use server"

import { serverGet, serverPost } from "@/lib/api-server"

export async function getOrganizationsAsAdmin() {
  return serverGet("/api/admin/organizations")
}

export async function getOrganizationDetailsAsAdmin(organizationId: string) {
  return serverGet(`/api/admin/organizations/${organizationId}`)
}

export async function createOrganizationWithOwner(data: any) {
  return serverPost("/api/admin/create-organization", data)
}

export async function getAllUsers() {
  return serverGet("/api/admin/users")
}

export async function searchPaystackCustomers(email: string) {
  return serverPost("/api/admin/search-paystack-customers", { email })
}

export async function checkDomainAvailability(domain: string) {
  return serverPost("/api/admin/check-domain", { domain })
}

export async function getCustomersWithActiveSubscriptions(email: string) {
  return serverPost("/api/admin/search-paystack-customers", { email })
}

export async function getOwnerInvitation(invitationId: string) {
  return serverGet(`/api/organization-actions/invitation/${invitationId}`)
}

export async function acceptOwnerInvitation(data: any) {
  return serverPost("/api/organization-actions/accept-invitation", data)
}

export async function createSubscription(data: any) {
  return serverPost("/api/subscriptions", data)
}

export async function getOrganizationSubscriptions(organizationId: string) {
  return serverGet("/api/subscriptions", { organizationId })
}
