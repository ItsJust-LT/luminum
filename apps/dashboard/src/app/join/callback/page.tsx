"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"
import { toast } from "sonner"

function JoinCallbackContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Completing join…")
  const { data: session, isPending: sessionLoading } = authClient.useSession()

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setMessage("Missing join link. Ask your admin for a new link.")
      return
    }

    if (sessionLoading) {
      setMessage("Loading session…")
      return
    }

    if (!session?.user) {
      setStatus("error")
      setMessage("You are not signed in. Go back to the join link and sign in or create an account.")
      return
    }

    let cancelled = false
    void (async () => {
      setMessage("Adding you to the organization…")
      const res = await api.organizationActions.acceptJoinLink({ token })
      if (cancelled) return
      if (res.status === 401) {
        setStatus("error")
        setMessage(typeof res.error === "string" ? res.error : "Could not complete join.")
        return
      }
      if (!res.success || !res.organizationSlug) {
        setStatus("error")
        setMessage(typeof res.error === "string" ? res.error : "Could not complete join.")
        return
      }
      setStatus("success")
      setMessage(
        res.alreadyMember
          ? "You are already a member. Redirecting to your workspace…"
          : "You have joined the organization. Redirecting…",
      )
      toast.success(res.alreadyMember ? "You are already on this team." : "Welcome to the team.")
      const slug = res.organizationSlug
      setTimeout(() => {
        window.location.href = `/${slug}/dashboard`
      }, 800)
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, session, sessionLoading])

  if (status === "loading") {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <Card className="border-border/60 w-full max-w-md shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 className="text-primary h-10 w-10 animate-spin" />
            <p className="text-muted-foreground text-sm">{message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <Card className="border-border/60 w-full max-w-md shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="bg-chart-2/15 flex h-14 w-14 items-center justify-center rounded-full">
              <CheckCircle className="text-chart-2 h-8 w-8" />
            </div>
            <p className="text-foreground text-sm font-medium">{message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <Card className="border-border/60 w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-full">
            <XCircle className="text-destructive h-8 w-8" />
          </div>
          <p className="text-foreground text-sm font-medium">{message}</p>
          <Button variant="outline" size="sm" asChild>
            <a href="/">Home</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center p-6">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      }
    >
      <JoinCallbackContent />
    </Suspense>
  )
}
