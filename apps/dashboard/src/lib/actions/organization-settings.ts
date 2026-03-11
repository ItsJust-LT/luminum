"use server"

import { serverGet, serverPatch, serverPost, serverDelete } from "@/lib/api-server"

export interface OrganizationSettings {
  name: string
  slug: string
  logo?: string
  country: string
  currency: string
  payment_provider: string
  billing_email?: string
  tax_id?: string
  billing_address?: {
    street?: string; city?: string; state?: string; postal_code?: string; country?: string
  }
  metadata?: {
    type?: string; industry?: string; description?: string; website?: string; phone?: string
  }
  max_storage_bytes?: number
  used_storage_bytes?: number
  storage_usage_percent?: number
  storage_warning?: boolean
  analytics?: boolean
  emails?: boolean
}

export async function getOrganizationEmailsEnabled(organizationId: string): Promise<boolean> {
  const result = await serverGet("/api/organization-settings/emails-enabled", { organizationId })
  return result.enabled || false
}

export async function getOrganizationSettings(organizationId: string) {
  return serverGet("/api/organization-settings", { organizationId })
}

export async function updateOrganizationSettings(organizationId: string, updates: Partial<OrganizationSettings>) {
  return serverPatch(`/api/organization-settings?organizationId=${organizationId}`, updates)
}

export async function uploadOrganizationLogo(organizationId: string, file: File) {
  const bytes = await file.arrayBuffer()
  const logoBase64 = Buffer.from(bytes).toString("base64")
  return serverPost(`/api/organization-settings/upload-logo?organizationId=${organizationId}`, {
    logoBase64, fileName: file.name, contentType: file.type,
  })
}

export async function deleteOrganizationLogo(organizationId: string) {
  return serverDelete(`/api/organization-settings/logo?organizationId=${organizationId}`)
}
