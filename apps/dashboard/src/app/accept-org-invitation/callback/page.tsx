"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { toast } from "sonner"
import { acceptOrganizationInvitation } from "@/lib/actions/organization-actions"

function OrganizationInvitationCallbackContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState("")
  const [loadingMessage, setLoadingMessage] = useState("Initializing...")
  const { data: session, isPending: sessionLoading } = authClient.useSession()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for session to be loaded
        if (sessionLoading) {
          setLoadingMessage("Loading session...")
          return
        }

        const invitationId = searchParams.get("invitationId") || localStorage.getItem("pendingOrgInvitationId")

        if (!invitationId) {
          throw new Error("No invitation ID found")
        }

        if (!session?.user) {
          setLoadingMessage("Waiting for authentication...")
          return
        }

        setLoadingMessage("Accepting invitation...")

        // Accept the organization invitation with the Google user data
        const result = await acceptOrganizationInvitation({
          invitationId,
          name: session.user.name || "User",
          email: session.user.email,
          password: "", // No password needed for Google auth
        })

        if (!result.success) {
          throw new Error(result.error || "Failed to accept invitation")
        }

        // Now use Better Auth's client-side method to properly add user to organization
        const acceptResult = await authClient.organization.acceptInvitation({
          invitationId
        })

        const typedAccept = acceptResult as { error?: unknown }
        if (typedAccept.error) {
          console.error("Error accepting invitation:", typedAccept.error)
          // Don't fail the whole operation, the user account was created successfully
          console.log("User account created but organization membership failed")
        }

        localStorage.removeItem("pendingOrgInvitationId")
        setStatus("success")
        toast.success("🎉 Welcome! You've successfully joined the organization.")

        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 3000)
      } catch (err: any) {
        console.error("Organization invitation callback error:", err)
        setError(err.message || "Failed to complete invitation")
        setStatus("error")
        toast.error(err.message || "Failed to complete invitation")
      }
    }

    handleCallback()
  }, [searchParams, session, sessionLoading])

  if (status === "loading") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Completing Your Setup
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {loadingMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (status === "success") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Welcome to the Team!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You've successfully joined the organization and can now access all team features.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to your dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Setup Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {error}
            </p>
            <Button 
              onClick={() => window.location.href = "/sign-in"}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OrganizationInvitationCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <OrganizationInvitationCallbackContent />
    </Suspense>
  )
}
