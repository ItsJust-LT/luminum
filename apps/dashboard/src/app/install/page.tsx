import InstallContent from "./install-content"
import { headers } from "next/headers"
import type { Metadata } from "next"
import { absoluteBrandingIconUrl } from "@/lib/branding-icon-url"

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers()
  const orgName = hdrs.get("x-org-name")
  const orgLogo = hdrs.get("x-org-logo")
  const isCustom = hdrs.get("x-custom-domain") === "true"
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || ""
  const proto = hdrs.get("x-forwarded-proto") || "https"

  if (isCustom && orgName) {
    const branding = absoluteBrandingIconUrl({ host, proto, orgName, orgLogo })
    const description = `Add ${orgName} to your home screen for the best experience.`
    return {
      title: { absolute: orgName },
      description,
      applicationName: orgName,
      appleWebApp: {
        capable: true,
        title: orgName,
        statusBarStyle: "black-translucent",
      },
      icons: {
        icon: [
          { url: branding.url, type: branding.type, sizes: "192x192" },
          { url: branding.url, type: branding.type, sizes: "512x512" },
          { url: branding.url, type: branding.type },
        ],
        apple: [{ url: branding.url, sizes: "180x180", type: branding.type }],
        shortcut: [{ url: branding.url, type: branding.type }],
      },
      openGraph: {
        title: orgName,
        description,
        siteName: orgName,
        type: "website",
        images: orgLogo?.trim()
          ? [{ url: orgLogo.trim(), width: 512, height: 512, alt: orgName }]
          : [{ url: branding.url, width: 512, height: 512, alt: orgName }],
      },
      twitter: {
        card: "summary_large_image",
        title: orgName,
        description,
        images: orgLogo?.trim() ? [orgLogo.trim()] : [branding.url],
      },
    }
  }

  return {
    title: "Install Luminum",
    description:
      "Install Luminum as an app on your phone or computer for the best experience.",
  }
}

export default async function InstallPage() {
  const hdrs = await headers()
  const orgName = hdrs.get("x-org-name") || undefined
  const orgLogo = hdrs.get("x-org-logo") || undefined
  const isCustom = hdrs.get("x-custom-domain") === "true"
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || ""
  const proto = hdrs.get("x-forwarded-proto") || "https"

  const brandIconSrc =
    isCustom && orgName
      ? absoluteBrandingIconUrl({ host, proto, orgName, orgLogo }).url
      : undefined

  return (
    <InstallContent orgName={orgName} orgLogo={orgLogo} brandIconSrc={brandIconSrc} />
  )
}
