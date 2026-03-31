import type { Metadata } from "next"
import { headers } from "next/headers"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import { SignInView, type SignInOrgBranding } from "./sign-in-view"

export const metadata: Metadata = dashboardTitle("Sign in")

export default async function SignInPage() {
  const h = await headers()
  const custom = h.get("x-custom-domain") === "true"
  const orgName = h.get("x-org-name")
  const rawLogo = (h.get("x-org-logo") || "").trim()

  const orgBranding: SignInOrgBranding | null =
    custom && orgName
      ? {
          name: orgName,
          logo: rawLogo || null,
        }
      : null

  return <SignInView orgBranding={orgBranding} />
}
