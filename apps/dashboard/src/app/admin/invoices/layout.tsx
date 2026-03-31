import type { Metadata } from "next"
import { dashboardTitle } from "@/lib/dashboard-metadata"

export const metadata: Metadata = dashboardTitle("Invoices")

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
