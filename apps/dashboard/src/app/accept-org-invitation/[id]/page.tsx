import { notFound } from "next/navigation"
import { AcceptOrganizationInvitationForm } from "@/components/dashboard/accept-organization-invitation-form"
import { getOrganizationInvitation } from "@/lib/actions/organization-actions"

export default async function AcceptOrganizationInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOrganizationInvitation(id)

  if (!result.success || !result.invitation) {
    notFound()
  }

  const invitation = result.invitation

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-3">
            Welcome to Luminum Agency
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
            You've been invited to join
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-gray-200 dark:border-slate-700">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {invitation.organizationName || "the organization"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            as a <span className="font-medium capitalize">{invitation.role}</span>
          </p>
        </div>

        {/* Main Form */}
        <AcceptOrganizationInvitationForm
          invitation={{
            id: invitation.id,
            email: invitation.email,
            organizationId: invitation.organizationId,
            organizationName: invitation.organizationName,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
          }}
        />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By accepting this invitation, you agree to our{" "}
            <a href="https://luminum.agency/terms-of-service" className="text-blue-600 dark:text-blue-400 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="https://luminum.agency/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
