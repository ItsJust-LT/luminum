"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export default function LegacyAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === "/organizations") router.replace("/admin/organizations")
    else if (pathname === "/users") router.replace("/admin/users")
    else if (pathname?.startsWith("/users/")) router.replace(`/admin${pathname}`)
  }, [pathname, router])

  return <>{children}</>
}
