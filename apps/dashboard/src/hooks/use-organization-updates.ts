"use client"

import { useCallback } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { toast } from "sonner"

export function useOrganizationUpdates() {
  const { organization, refreshOrganization } = useOrganization()

  const updateOrganizationData = useCallback(async (updates: Partial<{
    name?: string
    slug?: string
    logo?: string
    country?: string
    currency?: string
    payment_provider?: string
    billing_email?: string
    tax_id?: string
    billing_address?: any
    metadata?: any
  }>) => {
    try {
      // Refresh the organization data to get the latest changes
      await refreshOrganization()
      
      // Show success message
      toast.success("Organization updated successfully")
    } catch (error) {
      console.error("Error updating organization:", error)
      toast.error("Failed to update organization")
    }
  }, [refreshOrganization])

  const updateOrganizationLogo = useCallback(async (logoUrl: string) => {
    try {
      // Refresh the organization data to get the latest logo
      await refreshOrganization()
      
      toast.success("Logo updated successfully")
    } catch (error) {
      console.error("Error updating logo:", error)
      toast.error("Failed to update logo")
    }
  }, [refreshOrganization])

  return {
    organization,
    updateOrganizationData,
    updateOrganizationLogo,
    refreshOrganization
  }
}

