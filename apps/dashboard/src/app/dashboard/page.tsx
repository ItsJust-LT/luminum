"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/client"
import { authClient } from "@/lib/auth/client"
import { OrganizationSelector } from "@/components/dashboard/organization-selector"
import LoadingAnimation from "@/components/LoadingAnimation"

export default function DashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [checkingOrgs, setCheckingOrgs] = useState(true)
  const [hasOrgs, setHasOrgs] = useState<boolean | null>(null)
  const [firstSlug, setFirstSlug] = useState<string | null>(null)

  useEffect(() => {
    if (isPending || !session?.user) {
      if (!isPending && !session?.user) {
        router.replace("/sign-in")
      }
      return
    }

    let cancelled = false
    setCheckingOrgs(true)

    authClient.organization
      .list()
      .then((result) => {
        if (cancelled) return
        const data = (result as { data?: Array<{ id?: string; slug?: string }> })?.data
        const orgs = data ?? []
        setHasOrgs(orgs.length > 0)
        if (orgs.length === 1 && orgs[0]?.slug) {
          setFirstSlug(orgs[0].slug)
        } else {
          setFirstSlug(null)
        }
      })
      .catch(() => {
        if (!cancelled) setHasOrgs(false)
      })
      .finally(() => {
        if (!cancelled) setCheckingOrgs(false)
      })

    return () => {
      cancelled = true
    }
  }, [session?.user, isPending, router])

  // Redirect to single org's dashboard
  useEffect(() => {
    if (checkingOrgs || hasOrgs === null || !firstSlug) return
    router.replace(`/${firstSlug}/dashboard`)
  }, [checkingOrgs, hasOrgs, firstSlug, router])

  if (isPending || !session?.user) {
    return <LoadingAnimation />
  }

  if (checkingOrgs || (hasOrgs === true && firstSlug)) {
    return <LoadingAnimation />
  }

  // No orgs or multiple orgs: show selector (selector handles 0 orgs)
  return <OrganizationSelector />
}
