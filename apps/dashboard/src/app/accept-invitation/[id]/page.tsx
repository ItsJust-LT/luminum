import { InvitationSignupForm } from "@/components/auth/invitation-signup-form"

interface AcceptInvitationPageProps {
  params: Promise<{ id: string }>
}

export default async function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
  const { id } = await params

  return <InvitationSignupForm invitationId={id} />
}
