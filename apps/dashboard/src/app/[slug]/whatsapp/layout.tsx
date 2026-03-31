import type { Metadata } from "next"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import WhatsAppShell from "./whatsapp-shell"

export const metadata: Metadata = dashboardTitle("WhatsApp")

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return <WhatsAppShell>{children}</WhatsAppShell>
}
