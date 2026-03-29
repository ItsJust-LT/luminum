import { headers } from "next/headers"
import { SignInView, type SignInOrgBranding } from "./sign-in-view"

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
