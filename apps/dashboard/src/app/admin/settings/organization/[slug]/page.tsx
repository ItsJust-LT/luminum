"use client"

import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Shield, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminOrganizationSettingsPanel } from "@/components/admin/admin-organization-settings-panel"

export default function AdminOrganizationSettingsBySlugPage() {
  const params = useParams()
  const router = useRouter()
  const slugParam = params.slug
  const slug = typeof slugParam === "string" ? slugParam : Array.isArray(slugParam) ? slugParam[0] : ""
  const activeSlug = slug.trim() || null

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
              <SlidersHorizontal className="h-7 w-7 text-primary" />
              Organization settings
            </h1>
            <p className="mt-1.5 max-w-3xl text-muted-foreground">
              Platform admin controls for this tenant: features, mail delivery, branding, team, and danger zone. Tenant
              UI lives under{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/{activeSlug || "slug"}/settings</code>.{" "}
              <Link href="/admin/settings" className="font-medium text-foreground underline">
                Platform settings
              </Link>
            </p>
          </div>
        </motion.div>

        <Alert className="border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Platform administrator</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Opened from the{" "}
            <Link href="/admin/organizations" className="font-medium text-foreground underline">
              Organizations
            </Link>{" "}
            list. Use the back control above the org name to return.
          </AlertDescription>
        </Alert>

        {activeSlug ? (
          <AdminOrganizationSettingsPanel
            activeSlug={activeSlug}
            showOrganizationPicker={false}
            showSlugPageChrome
            idPrefix="admin-org-slug"
            onActiveSlugChange={(next) => {
              router.replace(`/admin/settings/organization/${encodeURIComponent(next)}`)
            }}
            onOrganizationNotFound={() => {
              router.replace("/admin/organizations")
            }}
            onOrganizationDeleted={async () => {
              router.replace("/admin/organizations")
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Invalid organization URL.</p>
        )}
      </div>
    </div>
  )
}
