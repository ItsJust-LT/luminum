"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { authClient } from "@/lib/auth/client"

export default function InvitationCallbackPage() {
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

        const invitationId = searchParams.get("invitationId") || localStorage.getItem("pendingInvitationId")

        if (!invitationId) {
          throw new Error("No invitation ID found")
        }

        if (!session?.user) {
          setLoadingMessage("Waiting for authentication...")
          return
        }

        setLoadingMessage("Accepting invitation...")

        await authClient.acceptInvitation({
          invitationId,
          name: session.user.name || "User",
          email: session.user.email,
          password: "", 
        })

        localStorage.removeItem("pendingInvitationId")
        setStatus("success")

        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 2000)
      } catch (err: any) {
        console.error("Invitation callback error:", err)
        setError(err.message || "Failed to complete invitation")
        setStatus("error")
      }
    }

    handleCallback()
  }, [searchParams, session, sessionLoading])

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <Card className="mx-auto w-full max-w-md border-0 bg-card shadow-xl">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing your registration...</h2>
            <p className="text-gray-600">{loadingMessage}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (status === "success") return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <Card className="mx-auto w-full max-w-md border-0 bg-card shadow-xl">
        <CardContent className="text-center py-16">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Luminum Agency!</h2>
          <p className="text-gray-600 mb-6">Your account has been created successfully with Google.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <Card className="mx-auto w-full max-w-md border-0 bg-card shadow-xl">
        <CardContent className="text-center py-16">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button variant="outline" onClick={() => (window.location.href = "/sign-in")} className="bg-transparent">
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  )
  
}
