import type { Metadata } from "next"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import HomeEntryClient from "./home-entry-client"

export const metadata: Metadata = dashboardTitle("Home")

export default function HomePage() {
  return <HomeEntryClient />
}
