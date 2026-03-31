import type { Metadata } from "next"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import { MailWorkspaceLayout } from "@/components/emails/mail-workspace-layout"

export const metadata: Metadata = dashboardTitle("Emails")

export default function EmailsSectionLayout({ children }: { children: React.ReactNode }) {
  return <MailWorkspaceLayout>{children}</MailWorkspaceLayout>
}
