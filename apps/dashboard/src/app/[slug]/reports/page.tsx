"use client"

import { useSession } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import LoadingAnimation from "@/components/LoadingAnimation"
import { FileText } from "lucide-react"

export default function OrganizationReportsPage() {
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Reports</h1>
      <p className="max-w-sm text-muted-foreground">
        Reports for your organization are coming soon.
      </p>
    </div>
  )
}
