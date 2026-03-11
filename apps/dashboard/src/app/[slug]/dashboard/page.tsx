"use client"

import { useSession } from "@/lib/auth/client"
import { OrganizationDashboard } from "@/components/dashboard/organization-dashboard"
import { useRouter } from "next/navigation"
import LoadingAnimation from "@/components/LoadingAnimation"

export default function OrganizationDashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  if (isPending) {
    return <LoadingAnimation />
  }

  if (!session) {
    router.push("/sign-in")
    return null
  }

  // The layout component handles organization validation and access control
  // The OrganizationDashboard component handles its own data fetching
  return <OrganizationDashboard />
}
