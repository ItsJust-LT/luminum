"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"
import { toast } from "sonner"

function OwnerInvitationCallbackContent() {
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

        const invitationId = searchParams.get("invitationId") || localStorage.getItem("pendingOwnerInvitationId")

        if (!invitationId) {
          throw new Error("No invitation ID found")
        }

        if (!session?.user) {
          setLoadingMessage("Waiting for authentication...")
          return
        }

        setLoadingMessage("Accepting invitation...")

        const invRes = (await api.organizationActions.getInvitation(invitationId)) as {
          success?: boolean
          invitation?: { ownershipTransfer?: boolean }
        }
        const isTransfer = !!invRes.success && !!invRes.invitation?.ownershipTransfer

        const result = isTransfer
          ? await api.organizationActions.acceptOwnershipTransfer({ invitationId })
          : await api.organizationActions.acceptInvitation({
              invitationId,
              name: session.user.name || "User",
              email: session.user.email || "",
              password: "",
            })

        if (result.success) {
          localStorage.removeItem("pendingOwnerInvitationId")
          setStatus("success")
          toast.success(
            isTransfer
              ? "🎉 You are now the organization owner."
              : "🎉 Welcome! Your account has been created and you are now the owner of the organization.",
          )

          const slug = (result as { organizationSlug?: string }).organizationSlug
          setTimeout(() => {
            window.location.href = slug ? `/${slug}/dashboard` : "/dashboard"
          }, 2500)
        } else {
          throw new Error(result.error || "Failed to accept invitation")
        }
      } catch (err: any) {
        console.error("Owner invitation callback error:", err)
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
              Welcome to Luminum Agency!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your account has been created successfully and you are now the owner of the organization.
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

export default function OwnerInvitationCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
      <OwnerInvitationCallbackContent />
    </Suspense>
  )
}
