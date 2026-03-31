import type { Metadata } from "next"
import { Suspense } from "react"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import InvitationCallbackPage from "./InvitationCallbackPage"

export const metadata: Metadata = dashboardTitle("Invitation")

export default function CallbackPage() {
  return (
    <Suspense fallback={<p className="text-center py-20">Loading...</p>}>
      <InvitationCallbackPage />
    </Suspense>
  )
}
