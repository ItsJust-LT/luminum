"use server"

import { serverGet, serverPost, serverPatch } from "@/lib/api-server"

export async function getOrganizationInvitation(invitationId: string) {
  return serverGet(`/api/organization-actions/invitation/${invitationId}`)
}

export async function checkUserExists(email: string) {
  return serverPost("/api/organization-actions/check-user", { email })
}

export async function sendOrganizationInvitation(data: {
  email: string; role: "admin" | "member"; organizationId: string; organizationName: string;
  invitedBy: { name: string; email: string; id: string }
}) {
  return serverPost("/api/organization-actions/send-invitation", data)
}

export async function acceptOrganizationInvitation(data: {
  invitationId: string; name: string; email: string; password: string
}) {
  return serverPost("/api/organization-actions/accept-invitation", data)
}

export async function removeMemberFromOrganization(data: {
  memberId: string; memberEmail: string; memberName: string; organizationName: string; organizationId: string
}) {
  return serverPost("/api/organization-actions/remove-member", data)
}

export async function getOrganizationInvitations(organizationId: string) {
  return serverGet("/api/organization-actions/invitations", { organizationId })
}

export async function cancelOrganizationInvitation(invitationId: string) {
  return serverPost("/api/organization-actions/cancel-invitation", { invitationId })
}

export async function addMemberToOrganization(data: {
  email: string; role: "admin" | "member"; organizationId: string
}) {
  return serverPost("/api/organization-actions/add-member", data)
}

export async function updateMemberRole(data: {
  memberId: string; newRole: "admin" | "member"; organizationId: string
}) {
  return serverPatch("/api/organization-actions/update-role", data)
}
