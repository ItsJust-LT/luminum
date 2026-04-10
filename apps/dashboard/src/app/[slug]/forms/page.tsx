import type { Metadata } from "next"
import { Suspense } from "react"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import { FormsPage } from "@/components/forms/forms-page"

export const metadata: Metadata = dashboardTitle("Forms")

export default function Forms() {
  return (
    <Suspense fallback={null}>
      <FormsPage />
    </Suspense>
  )
}
