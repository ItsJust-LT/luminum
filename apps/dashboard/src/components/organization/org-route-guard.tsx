"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getRequiredPermissionsForOrgSubpath, hasAllPermissions } from "@luminum/org-permissions"
import { orgNavPath, orgRelativePath } from "@/lib/org-nav-path"
import { useOrganization } from "@/lib/contexts/organization-context"

export function OrgRouteGuard({
  slug,
  flatRoutes,
  children,
}: {
  slug: string
  flatRoutes: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { organization, permissionsReady, permissionSet } = useOrganization()

  useEffect(() => {
    if (!organization || !permissionsReady) return
    const sub = orgRelativePath(pathname ?? "/", slug, flatRoutes)
    const required = getRequiredPermissionsForOrgSubpath(sub)
    if (!hasAllPermissions(permissionSet, required)) {
      router.replace(orgNavPath(slug, flatRoutes, "dashboard"))
    }
  }, [pathname, slug, flatRoutes, organization?.id, permissionsReady, permissionSet, router, organization])

  return <>{children}</>
}
