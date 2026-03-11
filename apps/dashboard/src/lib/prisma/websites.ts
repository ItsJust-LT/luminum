"use server"

import { serverGet, serverPost, serverPatch, serverDelete } from "@/lib/api-server"
import type { Website } from "../types/websites"

export async function createWebsite(data: {
  name: string; domain: string; organization_id: string; analytics?: boolean
}): Promise<{ data: Website | null; error: string | null }> {
  return serverPost("/api/websites", data)
}

export async function getWebsitesByOrganization(organizationId: string): Promise<{ data: Website[]; error: string | null }> {
  return serverGet("/api/websites", { organizationId })
}

export async function getAllWebsites(): Promise<{ data: Website[]; error: string | null }> {
  return serverGet("/api/websites")
}

export async function updateWebsite(id: string, data: Partial<Pick<Website, "name" | "domain" | "analytics">>): Promise<{ data: Website | null; error: string | null }> {
  return serverPatch(`/api/websites/${id}`, data)
}

export async function deleteWebsite(id: string): Promise<{ success: boolean; error: string | null }> {
  return serverDelete(`/api/websites/${id}`)
}

export async function getWebsiteByDomain(domain: string): Promise<{ data: Website | null; error: string | null }> {
  return serverGet("/api/websites/by-domain", { domain })
}

export async function checkDomainAvailability(domain: string): Promise<{ available: boolean; error: string | null }> {
  return serverGet("/api/websites/check-domain", { domain })
}

export async function toggleWebsiteAnalytics(id: string, enabled: boolean): Promise<{ data: Website | null; error: string | null }> {
  return serverPost(`/api/websites/${id}/toggle-analytics`, { enabled })
}
