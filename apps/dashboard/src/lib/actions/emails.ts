"use server"

import { serverGet, serverPost, serverDelete } from "@/lib/api-server"

export interface EmailFilters {
  read?: boolean
  search?: string
  from?: string
  emailAddresses?: string[]
}

export async function checkEmailsEnabled(organizationId: string) {
  return serverGet("/api/emails/enabled", { organizationId })
}

export interface EmailSetupStatus {
  success: boolean
  access?: boolean
  setupComplete?: boolean
  domain?: string
  expectedMxHost?: string
  lastCheckAt?: string
  lastError?: string
  emailFromAddress?: string
  steps?: { title: string; description: string }[]
  error?: string
}

export async function getEmailSetupStatus(organizationId: string): Promise<EmailSetupStatus> {
  const res = await serverGet("/api/emails/setup-status", { organizationId })
  return res as EmailSetupStatus
}

/** Set the organization's email domain (website). Owner/admin only. */
export async function setEmailSetupDomain(organizationId: string, websiteId: string) {
  return serverPost("/api/emails/setup-domain", { organizationId, websiteId })
}

/** Run DNS (MX) check for the org's email domain; if valid, marks setup complete. */
export async function verifyEmailDns(organizationId: string) {
  return serverPost("/api/emails/verify-dns", { organizationId })
}

export async function getEmailAddresses(organizationId: string) {
  return serverGet("/api/emails/addresses", { organizationId })
}

export async function getEmails(
  organizationId: string,
  page: number = 1,
  limit: number = 20,
  filters?: EmailFilters
) {
  return serverGet("/api/emails", {
    organizationId, page, limit,
    read: filters?.read,
    search: filters?.search,
    from: filters?.from,
    emailAddresses: filters?.emailAddresses?.join(","),
  })
}

export async function getEmailById(emailId: string) {
  return serverGet(`/api/emails/${emailId}`)
}

export async function markEmailAsRead(emailId: string) {
  return serverPost(`/api/emails/${emailId}/read`)
}

export async function markEmailAsUnread(emailId: string) {
  return serverPost(`/api/emails/${emailId}/unread`)
}

export async function deleteEmail(emailId: string) {
  return serverDelete(`/api/emails/${emailId}`)
}

export async function getUnreadEmailCount(organizationId: string) {
  return serverGet("/api/emails/unread-count", { organizationId })
}

export async function getEmailAttachmentUrl(emailId: string, attachmentIndex: number) {
  return serverGet(`/api/emails/${emailId}/attachment/${attachmentIndex}`)
}
