import type { Metadata } from "next"
import { dashboardTitle } from "@/lib/dashboard-metadata"

export async function generateMetadata(): Promise<Metadata> {
  return dashboardTitle("Support ticket")
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
