import type { Metadata } from "next"
import { dashboardTitle } from "@/lib/dashboard-metadata"
import { InvitationSignupForm } from "@/components/auth/invitation-signup-form"

export const metadata: Metadata = dashboardTitle("Accept invitation")

interface AcceptInvitationPageProps {
  params: Promise<{ id: string }>
}

export default async function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
  const { id } = await params

  return <InvitationSignupForm invitationId={id} />
}
