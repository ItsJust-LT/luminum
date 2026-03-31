"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { SlidersHorizontal, Shield } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AdminOrganizationSettingsPanel,
  type AdminOrgListItem,
} from "@/components/admin/admin-organization-settings-panel"

function AdminOrganizationSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [listLoading, setListLoading] = useState(true)
  const [organizations, setOrganizations] = useState<AdminOrgListItem[]>([])
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setListLoading(true)
    try {
      const result = (await api.admin.getOrganizations({ limit: "100" })) as {
        success?: boolean
        organizations?: Array<{ id: string; name: string; slug: string }>
        error?: string
      }
      const raw = result.organizations ?? []
      const mapped = raw.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))
      setOrganizations(mapped)
    } catch {
      setOrganizations([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (listLoading || organizations.length === 0) return
    const q = searchParams.get("slug")?.trim().toLowerCase() || null
    if (q && organizations.some((o) => o.slug === q)) {
      setActiveSlug(q)
      return
    }
    const fallback = organizations[0].slug
    setActiveSlug(fallback)
    if (q && q !== fallback) {
      router.replace(`/admin/settings/organization?slug=${encodeURIComponent(fallback)}`, { scroll: false })
    }
  }, [listLoading, organizations, searchParams, router])

  const handleSlugChange = (slug: string) => {
    setActiveSlug(slug)
    router.replace(`/admin/settings/organization?slug=${encodeURIComponent(slug)}`, { scroll: false })
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-7 w-7 text-primary" />
              Organization settings
            </h1>
            <p className="text-muted-foreground mt-1.5 max-w-3xl">
              Edit any organization as a platform admin: branding, URL slug, billing fields, invitations, and members.
              This is separate from{" "}
              <Link href="/admin/settings" className="underline font-medium text-foreground">
                platform settings
              </Link>{" "}
              and from a tenant&apos;s own{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">/{'{slug}'}/settings</code> UI.
            </p>
          </div>
        </motion.div>

        <Alert className="border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Platform administrator</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            You do not need to be a member of an organization to manage it here. For listing, creating orgs, and feature
            flags, use{" "}
            <Link href="/admin/organizations" className="underline font-medium text-foreground">
              Organizations
            </Link>
            .
          </AlertDescription>
        </Alert>

        {listLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full max-w-md" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : organizations.length === 0 ? (
          <Alert>
            <AlertTitle>No organizations</AlertTitle>
            <AlertDescription>
              <Link href="/admin/organizations" className="underline font-medium">
                Create an organization
              </Link>{" "}
              first.
            </AlertDescription>
          </Alert>
        ) : (
          <AdminOrganizationSettingsPanel
            activeSlug={activeSlug}
            onActiveSlugChange={handleSlugChange}
            showOrganizationPicker
            organizations={organizations}
            idPrefix="admin-org"
            onOrganizationDeleted={fetchList}
          />
        )}
      </div>
    </div>
  )
}

export default function AdminOrganizationSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AdminOrganizationSettingsContent />
    </Suspense>
  )
}
