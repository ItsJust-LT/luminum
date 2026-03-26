"use client"

import { createContext, useContext } from "react"

export interface CustomDomainContext {
  isCustomDomain: boolean
  orgSlug: string | null
  orgName: string | null
  orgLogo: string | null
  orgId: string | null
}

export const CustomDomainCtx = createContext<CustomDomainContext>({
  isCustomDomain: false,
  orgSlug: null,
  orgName: null,
  orgLogo: null,
  orgId: null,
})

export function useCustomDomain() {
  return useContext(CustomDomainCtx)
}
