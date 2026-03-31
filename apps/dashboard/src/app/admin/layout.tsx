import type { Metadata } from "next"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import AdminShell from "./admin-shell"

export const metadata: Metadata = dashboardTitle("Platform overview")

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
