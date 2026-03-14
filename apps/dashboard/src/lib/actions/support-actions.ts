"use server"

import { serverGet, serverPost, serverPatch } from "@/lib/api-server"
import type {
  CreateSupportTicketData,
  UpdateSupportTicketData,
} from "@/lib/types/support"

export async function createSupportTicket(data: CreateSupportTicketData) {
  return serverPost("/api/support/tickets", data)
}

export async function getSupportTickets(params?: {
  organizationId?: string; userId?: string; status?: string; priority?: string;
  assignedTo?: string; category?: string; search?: string; limit?: number; offset?: number
}) {
  return serverGet("/api/support/tickets", params)
}

export async function getSupportTicket(ticketId: string) {
  return serverGet(`/api/support/tickets/${ticketId}`)
}

export async function updateSupportTicket(ticketId: string, data: UpdateSupportTicketData) {
  return serverPatch(`/api/support/tickets/${ticketId}`, data)
}

export async function addSupportMessage(ticketId: string, data: { message: string; attachments?: any[]; message_type?: string }) {
  return serverPost(`/api/support/tickets/${ticketId}/messages`, data)
}

export async function addInternalNote(ticketId: string, message: string) {
  return serverPost(`/api/support/tickets/${ticketId}/internal-notes`, { message })
}

export async function getNewMessages(ticketId: string, since: string) {
  return serverGet(`/api/support/tickets/${ticketId}/messages`, { since })
}

export async function markTicketRead(ticketId: string) {
  return serverPost(`/api/support/tickets/${ticketId}/read`, {})
}

export async function getSupportStats() {
  return serverGet("/api/support/stats")
}

export async function getAdminUsers() {
  return serverGet("/api/support/admin-users")
}

export async function getOrganizationBySlug(slug: string) {
  return serverGet("/api/support/org-by-slug", { slug })
}
