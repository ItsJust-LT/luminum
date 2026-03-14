"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminReportsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/admin/analytics")
  }, [router])
  return null
}
