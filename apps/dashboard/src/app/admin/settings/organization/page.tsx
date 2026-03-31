import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { dashboardTitle } from "@/lib/dashboard-metadata"

export const metadata: Metadata = dashboardTitle("Organization settings")

export default async function LegacyAdminOrganizationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug: raw } = await searchParams
  const slug = typeof raw === "string" ? raw.trim() : ""
  if (slug) {
    redirect(`/admin/settings/organization/${encodeURIComponent(slug)}`)
  }
  redirect("/admin/organizations")
}
