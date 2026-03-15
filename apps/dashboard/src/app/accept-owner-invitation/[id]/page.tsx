"use client"

import { notFound } from "next/navigation"
import { AcceptOwnerInvitationForm } from "@/components/dashboard/accept-owner-invitation-form"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function AcceptOwnerInvitationPage() {
  const params = useParams()
  const id = params.id as string
  const [result, setResult] = useState<{
    success?: boolean
    invitation?: any
    error?: string
  } | null>(null)

  useEffect(() => {
    if (!id) return
    api.organizationActions
      .getInvitation(id)
      .then((res: any) => setResult(res))
      .catch(() => setResult({ success: false, error: "Failed to load invitation" }))
  }, [id])

  if (result === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <p className="text-muted-foreground">Loading invitation…</p>
      </div>
    )
  }

  if (!result.success || !result.invitation) {
    notFound()
  }

  const invitation = result.invitation

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-3">
            Welcome to Luminum Agency
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
            You've been invited to become the owner of
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-gray-200 dark:border-slate-700">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {invitation.organizationName || "the organization"}
            </span>
          </div>
        </div>

        <AcceptOwnerInvitationForm
          invitation={{
            id: invitation.id,
            email: invitation.email,
            organizationId: invitation.organizationId,
            organizationName: invitation.organizationName,
            expiresAt: invitation.expiresAt,
          }}
        />

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By accepting this invitation, you agree to our{" "}
            <a href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
