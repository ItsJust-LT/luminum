"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth/client"
import { BillingPageContent } from "@/components/billing/billing-page"
import { useRouter } from "next/navigation"
import LoadingAnimation from "@/components/LoadingAnimation"

export default function BillingPageRoute() {
  const { data: session, isPending } = useSession()
  const router = useRouter()




  if (isPending) {
    return <LoadingAnimation />
  }

  if (!session) {
    router.push("/sign-in")
    return null
  }

  return (
    <BillingPageContent
    
    />
  )
}
