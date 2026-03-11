"use server"

import { serverGet, serverPost, serverPatch } from "@/lib/api-server"
import type {
  CreateSupportTicketData,
  UpdateSupportTicketData,
  SupportTicketFilters,
} from "@/lib/types/support"

export async function createSupportTicket(data: CreateSupportTicketData) {
  return serverPost("/api/support/tickets", data)
}

export async function getSupportTickets(params?: {
  organizationId?: string; userId?: string; status?: string
}) {
  return serverGet("/api/support/tickets", params)
}

export async function getSupportTicket(ticketId: string) {
  return serverGet(`/api/support/tickets/${ticketId}`)
}

export async function updateSupportTicket(ticketId: string, data: UpdateSupportTicketData) {
  return serverPatch(`/api/support/tickets/${ticketId}`, data)
}

export async function addSupportMessage(ticketId: string, data: { message: string; attachments?: any[] }) {
  return serverPost(`/api/support/tickets/${ticketId}/messages`, data)
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
